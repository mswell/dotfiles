#
# Web crawling and data collection functions
#

# Crawls for JavaScript files
# Usage: JScrawler
# Requires: 200HTTP file
# Outputs: crawlJS, JSroot directory
JScrawler() {
  katana -jc -d 3 -rd 5 -u 200HTTP -ef eot,jpg,jpeg,gif,css,tif,tiff,png,ttf,otf,woff,woff2,ico,svg,txt -o crawlJS
  if [ -s "crawlJS" ]; then
    grep ".js$" crawlJS | fff -d 50 -S -o JSroot
  fi
}

# Finds AWS Cognito endpoints in JS files
# Usage: awsCognitoFinder
# Requires: JSroot directory (run JScrawler first)
# Outputs: awsVector file
awsCognitoFinder() {
  if [ ! -d "JSroot" ]; then
    echo "${red}[-] JSroot directory not found. Run JScrawler first.${reset}"
    return 1
  fi
  cd JSroot
  grep -lri 'AWSCognitoIdentity' | anew awsVector
  if [ -s "awsVector" ]; then
    echo "[+] Found AWS Cognito" | notify -silent -id nuclei
    notify -silent -bulk -data awsVector -id nuclei
  fi
  cd -
}

# Multi-tool web crawler (gospider, waybackurls, gau, katana)
# Usage: crawler
# Requires: Without404 file, domains file
# Outputs: crawlerResults.txt
crawler() {
  echo '${yellow}[+] Crawler in action...${reset}'
  local Domain
  Domain=$(cat domains)
  mkdir -p .tmp
  gospider -S Without404 -d 10 -c 20 -t 50 -K 3 --no-redirect --js -a -w --blacklist ".(eot|jpg|jpeg|gif|css|tif|tiff|png|ttf|otf|woff|woff2|ico|svg|txt)" --include-subs -q -o .tmp/gospider 2>/dev/null | anew -q gospider_out
  xargs -a Without404 -P 50 -I % bash -c "echo % | waybackurls" 2>/dev/null | anew -q waybackurls_out
  xargs -a Without404 -P 50 -I % bash -c "echo % | gau --blacklist eot,jpg,jpeg,gif,css,tif,tiff,png,ttf,otf,woff,woff2,ico,svg,txt --retries 3 --threads 50" 2>/dev/null | anew -q gau_out 2>/dev/null &>/dev/null
  katana -list Without404 -d 2 -ef eot,jpg,jpeg,gif,css,tif,tiff,png,ttf,otf,woff,woff2,ico,svg,txt -output katana_output.txt
  cat gospider_out gau_out waybackurls_out katana_output.txt 2>/dev/null | sed '/^\</d' | grep "$Domain" | sort -u | uro | anew -q crawlerResults.txt
}

# Gets all responses and saves to directory
# Usage: getdata
# Requires: ALLHTTP file
# Outputs: AllHttpData directory
getdata() {
  echo "${yellow}[+] Getting all responses and saving to roots folder...${reset}"
  [ -s "ALLHTTP" ] && httpx -l ALLHTTP -srd "AllHttpData"
}

# Gets responses with crawling
# Usage: getdatawithcrawl
# Requires: 200HTTP file
# Outputs: crawldata, 200HttpData directory
getdatawithcrawl() {
  echo "${yellow}[+] Getting all responses from crawled URLs...${reset}"
  if [ -s "200HTTP" ]; then
    katana -jc -d 3 -rd 5 -u 200HTTP -o crawldata
    [ -s "crawldata" ] && httpx -l crawldata -srd "200HttpData"
  fi
}

# Gets and validates JS URLs
# Usage: getjsurls
# Requires: crawlerResults.txt, domains, ALLHTTP files
# Outputs: jsfile_links.txt, js_livelinks.txt, JSroots directory
getjsurls() {
  echo "${yellow}[+] Getting and validating JS URLs...${reset}"
  local Domain
  Domain=$(cat domains)

  [ -s "crawlerResults.txt" ] && cat crawlerResults.txt | grep "$Domain" | grep -Ei ".(js)" | grep -iEv '(\.jsp|\.json)' | anew -q url_extract_js.txt
  [ -s "url_extract_js.txt" ] && cat url_extract_js.txt | cut -d '?' -f 1 | grep -Ei ".(js)" | grep -iEv '(\.jsp|\.json)' | grep "$Domain" | anew -q jsfile_links.txt
  [ -s "ALLHTTP" ] && subjs -i ALLHTTP | grep "$Domain" | anew -q jsfile_links.txt
  [ -s "ALLHTTP" ] && getJS -i ALLHTTP --complete | grep "$Domain" | anew -q jsfile_links.txt

  if [ -s "jsfile_links.txt" ]; then
    httpx -l jsfile_links.txt -follow-redirects -random-agent -silent -status-code -retries 2 -no-color | grep '200' | grep -v '301' | cut -d " " -f 1 | anew -q js_livelinks.txt
    [ -s "js_livelinks.txt" ] && fff -l js_livelinks.txt -d 1 -S -o JSroots
  fi
}

# Scans JS files for exposure and tokens with Nuclei
# Usage: getjsdata
# Requires: js_livelinks.txt file
# Outputs: jsinfo file
getjsdata() {
  echo "${yellow}[+] Scanning JS files for exposure and tokens...${reset}"
  if [ ! -s "js_livelinks.txt" ]; then echo "${red}[-] js_livelinks.txt not found or empty.${reset}"; return 1; fi
  nuclei -l js_livelinks.txt -tags exposure,token -o jsinfo
  [ -s "jsinfo" ] && notify -silent -bulk -data jsinfo -id nuclei
}

# Runs SecretFinder on JS files
# Usage: secretfinder
# Requires: js_livelinks.txt file
# Outputs: js_secrets_result, JSPathNoUrl, JSOutput
secretfinder() {
  echo '${yellow}[+] Running SecretFinder on JS files...${reset}'
  if [ ! -s "js_livelinks.txt" ]; then echo "${red}[-] js_livelinks.txt not found or empty.${reset}"; return 1; fi
  local regexs
  regexs=$(curl -s 'https://gist.githubusercontent.com/mswell/1070fae0021b08d5e5650743ea402b4b/raw/589e669dec183009f01eca2c2ef1401b5f77af2b/regexJS' | tr '\n' '|')
  rush -i js_livelinks.txt "python3 $SECRETFINDER_PATH -i {} -o cli -r '\w+($regexs)\w+' | grep -v custom_regex | anew js_secrets_result"
  if [ -s "js_secrets_result" ]; then
    grep -v custom_regex js_secrets_result | grep -iv '[URL]:' | anew JSPathNoUrl
    [ -s "JSPathNoUrl" ] && python3 "$BBTZ_COLLECTOR_PATH" JSOutput
  fi
}

# Scans for secrets using grep patterns
# Usage: secrets
# Outputs: Direct grep output to stdout
secrets() {
    echo "${yellow}[+] Scanning for secrets...${reset}"
    grep -HnriEo 'basic [a-zA-Z0-9=:+/-]{5,100}'
    grep -HnriEo 'AIza[0-9A-Za-z\-]{35}'
    grep -HnriEo 'https://hooks.slack.com/services/T[a-zA-Z0-9]{8}/B[a-zA-Z0-9]{8}/[a-zA-Z0-9]{24}'
    grep -HnriEo 'AKIA[0-9A-Z]{16}'
    grep -HnriEo 'bearer [a-zA-Z0-9\-\.=]+'
    grep -HnriEo 'cloudinary://[0-9]{15}:[0-9A-Za-z]+@[a-z]+'
    grep -HnriEo 'key-[0-9a-zA-Z]{32}'
    grep -HnriEo "(api_key|API_KEY|api-key|API-KEY|apikey|APIKEY)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"
    grep -HnriEo "(access_key|ACCESS_KEY|access_token|ACCESSTOKEN)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"
    grep -HnriEo 'bearer [a-zA-Z0-9-.=:_+/]{5,100}'
    grep -HnriEo "(auth_token|AUTH_TOKEN)"
    grep -HnriEo "(slack_api|SLACK_API|db_password|DB_PASSWORD|db_username|DB_USERNAME)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"
    grep -HnriEo "(authorizationToken|AUTHORIZATIONTOKEN|app_key|APPKEY|authorization|AUTHORIZATION|authentication|AUTHENTICATION)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"
    grep -HnriEo "(.{8}[A-z0-9-].amazonaws.com/)[A-z0-9-].{6}"
    grep -HnriEo "(.{8}[A-z0-9-].s3.amazonaws.com/)[A-z0-9-].{6}"
    grep -HnriEo "(.{8}[A-z0-9-].s3-amazonaws.com/)[A-z0-9_-].{6}"
    grep -HnriEo 'amzn.mws.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    grep -HnriEo "(amazonaws|AMAZONAWS)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"
    grep -HnriEo "(?i)aws(.{0,20})?(?-i)['\"][0-9a-zA-Z/+]{40}['\"]"
}
