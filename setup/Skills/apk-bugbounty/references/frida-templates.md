# Frida Script Templates for Android Bug Bounty

Ready-to-use Frida templates for common bypass scenarios.
Adapt class and method names based on static analysis findings.

**Usage:** `frida -U -f <package_name> -l script.js --no-pause`

---

## SSL Pinning Bypass (OkHttp3)

```javascript
Java.perform(function() {
    var CertificatePinner = Java.use("okhttp3.CertificatePinner");
    CertificatePinner.check.overload('java.lang.String', 'java.util.List').implementation = function(hostname, peerCertificates) {
        console.log("[*] OkHttp pinning bypassed for: " + hostname);
        return;
    };

    try {
        CertificatePinner.check$okhttp.overload('java.lang.String', 'kotlin.jvm.functions.Function0').implementation = function(hostname, func) {
            console.log("[*] OkHttp pinning bypassed (kotlin) for: " + hostname);
            return;
        };
    } catch(e) {}
});
```

## SSL Pinning Bypass (TrustManager)

```javascript
Java.perform(function() {
    var TrustManagerImpl = Java.use("com.android.org.conscrypt.TrustManagerImpl");
    TrustManagerImpl.verifyChain.implementation = function(untrustedChain, trustAnchorChain, host, clientAuth, ocspData, tlsSctData) {
        console.log("[*] TrustManager bypassed for: " + host);
        return untrustedChain;
    };
});
```

## SSL Pinning Bypass (Network Security Config)

```javascript
Java.perform(function() {
    var PlatformTrustManager = Java.use("android.security.net.config.NetworkSecurityTrustManager");
    PlatformTrustManager.checkServerTrusted.overload('[Ljava.security.cert.X509Certificate;', 'java.lang.String', 'java.net.Socket').implementation = function(chain, authType, socket) {
        console.log("[*] NetworkSecurityConfig pinning bypassed");
        return;
    };
});
```

## Root Detection Bypass (Generic + RootBeer)

```javascript
Java.perform(function() {
    // RootBeer library
    try {
        var RootBeer = Java.use("com.scottyab.rootbeer.RootBeer");
        RootBeer.isRooted.implementation = function() { return false; };
        RootBeer.isRootedWithBusyBox.implementation = function() { return false; };
        RootBeer.isRootedWithoutBusyBoxCheck.implementation = function() { return false; };
        RootBeer.detectRootManagementApps.implementation = function() { return false; };
        RootBeer.detectPotentiallyDangerousApps.implementation = function() { return false; };
        RootBeer.detectTestKeys.implementation = function() { return false; };
        RootBeer.checkForBusyBoxBinary.implementation = function() { return false; };
        RootBeer.checkForSuBinary.implementation = function() { return false; };
        RootBeer.checkSuExists.implementation = function() { return false; };
        RootBeer.checkForRWPaths.implementation = function() { return false; };
        RootBeer.checkForRootNative.implementation = function() { return false; };
        RootBeer.checkForMagiskBinary.implementation = function() { return false; };
        console.log("[*] RootBeer fully bypassed");
    } catch(e) { console.log("[!] RootBeer not found: " + e); }

    // File existence check bypass (su, magisk, etc.)
    var File = Java.use("java.io.File");
    var origExists = File.exists;
    File.exists.implementation = function() {
        var path = this.getAbsolutePath();
        var rootPaths = ["/system/bin/su", "/system/xbin/su", "/sbin/su", "/su/bin/su",
                         "/data/local/bin/su", "/data/local/xbin/su", "/system/app/Superuser.apk",
                         "magisk", "busybox", "Superuser"];
        for (var i = 0; i < rootPaths.length; i++) {
            if (path.indexOf(rootPaths[i]) !== -1) {
                console.log("[*] Hiding root file: " + path);
                return false;
            }
        }
        return origExists.call(this);
    };

    // System properties
    var SystemProperties = Java.use("android.os.SystemProperties");
    var origGet = SystemProperties.get.overload('java.lang.String', 'java.lang.String');
    origGet.implementation = function(key, def) {
        if (key === "ro.build.tags" || key === "ro.build.display.id") {
            return "release-keys";
        }
        return origGet.call(this, key, def);
    };
});
```

## Biometric / Authentication Bypass

```javascript
Java.perform(function() {
    // AndroidX BiometricPrompt
    try {
        var BiometricPrompt = Java.use("androidx.biometric.BiometricPrompt");
        BiometricPrompt.authenticate.overload('androidx.biometric.BiometricPrompt$PromptInfo').implementation = function(promptInfo) {
            console.log("[*] Biometric intercepted — triggering success");
            var callback = this.mAuthenticationCallback.value;
            var AuthResult = Java.use("androidx.biometric.BiometricPrompt$AuthenticationResult");
            var result = AuthResult.$new(null, null);
            callback.onAuthenticationSucceeded(result);
        };
    } catch(e) { console.log("[!] BiometricPrompt not found: " + e); }

    // FingerprintManager (deprecated but still used)
    try {
        var FingerprintManager = Java.use("android.hardware.fingerprint.FingerprintManager");
        FingerprintManager.authenticate.implementation = function(crypto, cancel, flags, callback, handler) {
            console.log("[*] FingerprintManager intercepted — triggering success");
            callback.onAuthenticationSucceeded(null);
        };
    } catch(e) {}
});
```

## Emulator Detection Bypass

```javascript
Java.perform(function() {
    var Build = Java.use("android.os.Build");
    Build.FINGERPRINT.value = "google/walleye/walleye:8.1.0/OPM1.171019.011/4448085:user/release-keys";
    Build.MODEL.value = "Pixel 2";
    Build.MANUFACTURER.value = "Google";
    Build.BRAND.value = "google";
    Build.PRODUCT.value = "walleye";
    Build.HARDWARE.value = "walleye";
    Build.BOARD.value = "walleye";
    Build.DEVICE.value = "walleye";
    Build.TAGS.value = "release-keys";

    // TelephonyManager
    try {
        var TelephonyManager = Java.use("android.telephony.TelephonyManager");
        TelephonyManager.getDeviceId.overload().implementation = function() { return "352099001761481"; };
        TelephonyManager.getSubscriberId.implementation = function() { return "310260000000000"; };
        TelephonyManager.getSimSerialNumber.implementation = function() { return "89014103211118510720"; };
        TelephonyManager.getOperatorName.implementation = function() { return "T-Mobile"; };
    } catch(e) {}

    console.log("[*] Emulator detection bypassed (Build + Telephony)");
});
```

## WebView JavaScript Bridge Exploitation

```javascript
// Use when addJavascriptInterface is found on API < 17
Java.perform(function() {
    var WebView = Java.use("android.webkit.WebView");

    WebView.loadUrl.overload('java.lang.String').implementation = function(url) {
        console.log("[*] WebView.loadUrl: " + url);
        this.loadUrl(url);
    };

    WebView.addJavascriptInterface.implementation = function(obj, name) {
        console.log("[*] JS Interface added: " + name + " → " + obj.getClass().getName());
        // List all methods exposed to JS
        var methods = obj.getClass().getMethods();
        for (var i = 0; i < methods.length; i++) {
            if (methods[i].isAnnotationPresent(Java.use("android.webkit.JavascriptInterface").class)) {
                console.log("    @JavascriptInterface: " + methods[i].getName());
            }
        }
        this.addJavascriptInterface(obj, name);
    };
});
```

## Intent Monitor (Exported Component PoC)

```javascript
Java.perform(function() {
    var Activity = Java.use("android.app.Activity");

    Activity.startActivity.overload('android.content.Intent').implementation = function(intent) {
        console.log("[*] startActivity: " + intent.toString());
        console.log("    Action: " + intent.getAction());
        console.log("    Data: " + intent.getDataString());
        console.log("    Component: " + intent.getComponent());
        var extras = intent.getExtras();
        if (extras !== null) {
            var keys = extras.keySet().iterator();
            while (keys.hasNext()) {
                var key = keys.next();
                console.log("    Extra[" + key + "] = " + extras.get(key));
            }
        }
        this.startActivity(intent);
    };

    Activity.onCreate.overload('android.os.Bundle').implementation = function(bundle) {
        console.log("[*] Activity.onCreate: " + this.getClass().getName());
        var intent = this.getIntent();
        if (intent !== null) {
            console.log("    Received intent: " + intent.toString());
            if (intent.getData() !== null) {
                console.log("    Data URI: " + intent.getData().toString());
            }
        }
        this.onCreate(bundle);
    };
});
```

## SharedPreferences Monitor

```javascript
Java.perform(function() {
    var Editor = Java.use("android.app.SharedPreferencesImpl$EditorImpl");

    Editor.putString.implementation = function(key, value) {
        console.log("[*] SharedPrefs.putString(" + key + ", " + value + ")");
        return this.putString(key, value);
    };

    Editor.putInt.implementation = function(key, value) {
        console.log("[*] SharedPrefs.putInt(" + key + ", " + value + ")");
        return this.putInt(key, value);
    };

    Editor.putBoolean.implementation = function(key, value) {
        console.log("[*] SharedPrefs.putBoolean(" + key + ", " + value + ")");
        return this.putBoolean(key, value);
    };

    // Also monitor reads
    var SharedPrefsImpl = Java.use("android.app.SharedPreferencesImpl");
    SharedPrefsImpl.getString.implementation = function(key, defValue) {
        var result = this.getString(key, defValue);
        console.log("[*] SharedPrefs.getString(" + key + ") = " + result);
        return result;
    };
});
```

## Method Return Value Override (Template)

```javascript
// Generic template — replace FULL.CLASS.NAME and METHOD_NAME
Java.perform(function() {
    var Target = Java.use("FULL.CLASS.NAME");

    Target.METHOD_NAME.implementation = function(/* match original args */) {
        var original = this.METHOD_NAME(/* pass same args */);
        console.log("[*] " + "FULL.CLASS.NAME.METHOD_NAME");
        console.log("    Original result: " + original);
        return true; // override return value
    };
});
```

## Crypto Key Logger

```javascript
// Logs encryption keys and IVs for further analysis
Java.perform(function() {
    var SecretKeySpec = Java.use("javax.crypto.spec.SecretKeySpec");
    SecretKeySpec.$init.overload('[B', 'java.lang.String').implementation = function(keyBytes, algorithm) {
        console.log("[*] SecretKeySpec: algo=" + algorithm + " key=" + bytesToHex(keyBytes));
        return this.$init(keyBytes, algorithm);
    };

    var IvParameterSpec = Java.use("javax.crypto.spec.IvParameterSpec");
    IvParameterSpec.$init.overload('[B').implementation = function(ivBytes) {
        console.log("[*] IvParameterSpec: iv=" + bytesToHex(ivBytes));
        return this.$init(ivBytes);
    };

    var Cipher = Java.use("javax.crypto.Cipher");
    Cipher.doFinal.overload('[B').implementation = function(input) {
        console.log("[*] Cipher.doFinal: input_len=" + input.length);
        var result = this.doFinal(input);
        console.log("    output_len=" + result.length);
        return result;
    };

    function bytesToHex(bytes) {
        var hex = [];
        for (var i = 0; i < bytes.length; i++) {
            hex.push(('0' + (bytes[i] & 0xFF).toString(16)).slice(-2));
        }
        return hex.join('');
    }
});
```
