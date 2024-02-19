#################
ResultsPath="$HOME/Recon"
ToolsPath="$HOME/Tools"
ConfigFolder="$HOME/tools/config"
GITHUB_TOKENS=${ToolsPath}/.github_tokens
UserAgent="User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/112.0"
DIRS_LARGE=$HOME/Lists/raft-medium-directories.txt

red=$(tput setaf 1)
green=$(tput setaf 2)
yellow=$(tput setaf 3)
reset=$(tput sgr0)

workspaceRecon() {
  name=$(echo $1 | unfurl -u domains)
  wdir=$name/$(date +%F)/
  mkdir -p $wdir
  cd $wdir
  echo $name | anew domains
}

wellSubRecon() {
  subdomainenum
  [ -s "asn" ] && cat asn | metabigor net --asn | anew cidr
  [ -s "cidr" ] && cat cidr | anew clean.subdomains
  brutesub
}

certspotter() {
  curl -s https://api.certspotter.com/v1/issuances\?domain\=$1\&expand\=dns_names\&expand\=issuer\&expand\=cert | jq -c '.[].dns_names' | grep -o '"[^"]\+"' | tr -d '"' | sort -fu
}

crtsh() {
  curl -s https://crt.sh/?q=%.$1 | sed 's/<\/\?[^>]\+>//g' | grep $1
}

cert() {
  curl -s "https://crt.sh/?q=%.$1&output=json" | jq -r '.[].name_value' | sed 's/\*\.//g' | anew
}

ipinfo() {
  curl http://ipinfo.io/$1
}

getfreshresolvers() {
  wget -nv -O $HOME/Lists/resolvers.txt https://raw.githubusercontent.com/trickest/resolvers/main/resolvers.txt
}

getalltxt() {
  wget -nv -O $HOME/Lists/all.txt https://gist.githubusercontent.com/jhaddix/86a06c5dc309d08580a018c66354a056/raw/96f4e51d96b2203f19f6381c8c545b278eaa0837/all.txt
}

getalive() {
  echo "${yellow}[+] Check live hosts ${reset}"
  cat naabuScan | httpx -silent -status-code -tech-detect -title -cl -timeout 10 -threads 10 -o HTTPOK
  cat HTTPOK | grep 200 | awk -F " " '{print $1}' | anew 200HTTP
  cat HTTPOK | grep -E '40[0-4]' | grep -Ev 404 | awk -F " " '{print $1}' | anew 403HTTP
  cat HTTPOK | grep -v 404 | awk '{print $1}' | anew Without404
  cat HTTPOK | awk -F " " '{print $1}' | anew ALLHTTP
}

nstakeover() {
  for domain in $(cat $1); do
    dig $domain +trace | grep NS | awk '{print $5}' | anew | egrep -Ev "root-servers|NS|NSEC3|NSEC" | sed 's/\.$//' | xargs -I{} bash -c "dig @{} $domain | grep -E 'SERVFAIL|REFUSED' && echo '$domain - {} Is vulnerable'"
  done
}

JScrawler() {
  katana -jc -d 3 -rd 5 -u 200HTTP -ef eot,jpg,jpeg,gif,css,tif,tiff,png,ttf,otf,woff,woff2,ico,svg,txt -o crawlJS
  cat crawlJS | grep ".js$" | fff -d 50 -S -o JSroot
}

awsCognitoFinder() {
  cd JSroot
  grep -lri 'AWSCognitoIdentity' | anew awsVector
  [ -s "awsVector" ] && echo "[+] Found AWS Cognito" | notify -silent -id nuclei
  [ -s "awsVector" ] && notify -silent -bulk -data awsVector -id nuclei
  cd -
}

jiraScan() {
  echo "${yellow}[+] Jira Scan ${reset}"
  cat ALLHTTP | nuclei -t $HOME/custom_nuclei_templates/ssrf-jira-well.yaml -H $UserAgent -o jiraNuclei
  [ -s "jiraNuclei" ] && echo "Jira verctor found :)" | notify -silent -id nuclei
  [ -s "jiraNuclei" ] && notify -silent -bulk -data jiraNuclei -id nuclei
}

GitScan() {
  echo "[+] Git scan"
  cat ALLHTTP | nuclei -tags git -H $UserAgent -o gitvector
  [ -s "gitvector" ] && echo "Git vector found :)" | notify -silent -id nuclei
  [ -s "gitvector" ] && notify -silent -bulk -data gitvector -id nuclei
}

lfiScan() {
  echo "[+] LFI scan"
  cat ALLHTTP | nuclei -tags lfi -H $UserAgent -o lfivector
  [ -s "lfivector" ] && echo "LFI vector found :)" | notify -silent -id nuclei
  [ -s "lfivector" ] && notify -silent -bulk -data lfivector -id nuclei
}

panelNuc() {
  echo "[+] Panel scan"
  [ -s "ALLHTTP" ] && cat ALLHTTP | nuclei -tags panel -H $UserAgent -o nucPanel
  [ -s "nucPanel" ] && echo "Panel found :)" | notify -silent -id nuclei
  [ -s "nucPanel" ] && notify -silent -bulk -data nucPanel -id nuclei
}

massALLHTTPtemplate() {
  find /root/Projects -type f -name ALLHTTP | xargs -I{} -P2 bash -c 'cat {}' | anew allhttpalive
  cat allhttpalive | nuclei -t $1 -o massALLTEST.txt
  [ -s "massALLTEST.txt" ] && cat massALLTEST.txt | notify -silent
}

exposureNuc() {
  echo "[+] Exposure scan"
  [ -s "ALLHTTP" ] && cat ALLHTTP | nuclei -tags exposure -H $UserAgent -o exposurevector
  [ -s "exposurevector" ] && echo "Exposure vector found :)" | notify -silent -id nuclei
  [ -s "exposurevector" ] && notify -silent -bulk -data exposurevector -id nuclei
}

naabuRecon() {
  naabu -l clean.subdomains -r $HOME/Lists/resolvers.txt -ec -tp 100 -sa -o naabuScanFull
  [ -s "naabuScanFull" ] && cat naabuScanFull | grep -v '\[' | anew naabuScan
}

updateTemplatesNuc() {
  rm -rf ~/nuclei-templates
  git clone --branch main --depth 1 https://github.com/projectdiscovery/nuclei-templates.git ~/nuclei-templates
}

naabuFullPorts() {
  naabu -p - -l clean.subdomains -exclude-ports 80,443,8443,21,25,22 -o full_ports.txt
}

nucTakeover() {
  echo "[+] Takeover scan"
  cat ALLHTTP | nuclei -tags takeover -H $UserAgent -o nucleiTakeover
  [ -s "nucleiTakeover" ] && echo "Takeover found :)" | notify -silent -id nuclei
  [ -s "nucleiTakeover" ] && notify -silent -bulk -data nucleiTakeover -id nuclei
  cat ALLHTTP | nuclei -t $HOME/custom_nuclei_templates/m4cddr-takeovers.yaml -H $UserAgent -o takeovers_m4c
  [ -s "takeovers_m4c" ] && echo "Takeover m4c found :)" | notify -silent -id nuclei
  [ -s "takeovers_m4c" ] && notify -silent -bulk -data takeovers_m4c -id nuclei
}

subPermutation() {
  echo "[+] Permutation"
  cat clean.subdomains | tr "." "\n" | anew words
  altdns -i clean.subdomains -o alt-output.txt -w words
  shuffledns -l alt-output.txt -r $HOME/Lists/resolvers.txt -o final.txt
  cp clean.subdomains oldsubs
  [ -s 'alt-output.txt' ] && rm -rf alt-output.txt
  cat final.txt | anew clean.subdomains
}

brutesub() {
  echo "[+] Brute subdomains"
  getfreshresolvers
  getalltxt
  bruteTop1million
  bruteAlltxt
  echo "[+] Brute subdomains complete"
}

bruteTop1million() {
  for domain in $(cat domains); do
    shuffledns -d $domain -r $HOME/Lists/resolvers.txt -w $HOME/Lists/subdomains-top1million-110000.txt -o brutesubs_out.txt
    cat brutesubs_out.txt | anew clean.subdomains
  done
  rm -rf brutesubs_out.txt
}

bruteAlltxt() {
  for domain in $(cat domains); do
    shuffledns -d $domain -r $HOME/Lists/resolvers.txt -w $HOME/Lists/all.txt -o brutesubs_out.txt
    cat brutesubs_out.txt | anew clean.subdomains
  done
  rm -rf brutesubs_out.txt
}

vhostEnum() {
  ffuf -w $HOME/Lists/namelist.txt -u http://example.com -H "HOST: example.com" -fs 100
}

secrets() {

  echo "[ + ] Checking for basic auth..."
  grep -HnriEo 'basic [a-zA-Z0-9=:+/-]{5,100}'

  echo "[ + ] Checking for Google Cloud or Maps Api..."
  grep -HnriEo 'AIza[0-9A-Za-z\-]{35}'

  echo "[ + ] Checking Slack webhooks..."
  grep -HnriEo 'https://hooks.slack.com/services/T[a-zA-Z0-9]{8}/B[a-zA-Z0-9]{8}/[a-zA-Z0-9]{24}'

  echo "[ + ] Checking Aws Access Key..."
  grep -HnriEo 'AKIA[0-9A-Z]{16}'

  echo "[ + ] Checking Bearer auth..."
  grep -HnriEo 'bearer [a-zA-Z0-9\-\.=]+'

  echo "[ + ] Checking Cloudinary auth key..."
  grep -HnriEo 'cloudinary://[0-9]{15}:[0-9A-Za-z]+@[a-z]+'

  echo "[ + ] Checking Mailgun api key..."
  grep -HnriEo 'key-[0-9a-zA-Z]{32}'

  echo "[ + ] Checking for Api key parameters..."
  grep -HnriEo "(api_key|API_KEY)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"
  grep -HnriEo "(api-key|API-KEY)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"
  grep -HnriEo "(apikey|APIKEY)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"

  echo "[ + ] Checking for access keys..."
  grep -HnriEo "(access_key|ACCESS_KEY)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"

  echo "[ + ] Checking for access token..."
  grep -HnriEo "(access_token|ACCESSTOKEN)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"

  echo "[ + ] Checking for Bearer Token..."
  grep -HnriEo 'bearer [a-zA-Z0-9-.=:_+/]{5,100}'

  echo "[ + ] Checking for auth token..."
  grep -HnriEo "(auth_token|AUTH_TOKEN)"

  echo "[ + ] Checking for slack api..."
  grep -HnriEo "(slack_api|SLACK_API)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"

  echo "[ + ] Checking for db password or username..."
  grep -HnriEo "(db_password|DB_PASSWORD)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"
  grep -HnriEo "(db_username|DB_USERNAME)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"

  echo "[ + ] Checking for authorization tokens..."
  grep -HnriEo "(authorizationToken|AUTHORIZATIONTOKEN)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"

  echo "[ + ] Checking for app key ..."
  grep -HnriEo "(app_key|APPKEY)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"

  echo "[ + ] Checking for authorization ..."
  grep -HnriEo "(authorization|AUTHORIZATION)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"

  echo "[ + ] Checking for authentication ..."
  grep -HnriEo "(authentication|AUTHENTICATION)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"

  echo "[ + ] Checking for aws links, buckets and secrets..."
  grep -HnriEo "(.{8}[A-z0-9-].amazonaws.com/)[A-z0-9-].{6}"
  grep -HnriEo "(.{8}[A-z0-9-].s3.amazonaws.com/)[A-z0-9-].{6}"
  grep -HnriEo "(.{8}[A-z0-9-].s3-amazonaws.com/)[A-z0-9_-].{6}"
  grep -HnriEo 'amzn.mws.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  grep -HnriEo "(amazonaws|AMAZONAWS)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"
  grep -HnriEo "(?i)aws(.{0,20})?(?-i)['\"][0-9a-zA-Z/+]{40}['\"]"

}

# Enumeracao de subdominios baseado no dominio informado no arquivo "domains"
subdomainenum() {
  echo "[+] Recon subdomains..."
  Domain=$(cat domains)
  subfinder -up
  subfinder -nW -t 100 -all -o subfinder.subdomains -dL domains
  cat subfinder.subdomains | anew all.subdomains
  rm -f subfinder.subdomains
  amass enum -v -norecursive -passive -nf all.subdomains -df domains -o amass.subdomains
  cat amass.subdomains | anew all.subdomains
  rm -f amass.subdomains
  curl -s "https://crt.sh/?q=%25.$Domain&output=json" | jq -r '.[].name_value' | sed 's/\*\.//g' | anew all.subdomains
  cat all.subdomains | dnsx -silent | anew clean.subdomains
  echo "[+] Passive subdomain recon completed :)"
}

# pesquisa subdominios no escopo da hackerone
checkscope() {
  # https://github.com/michael1026/inscope
  cat sorted.all.subdomains | inscope | tee -a inscope.sorted.all.subdomains
}

resolving() {
  shuffledns -d domains -list sorted.all.subdomains -r ~/tools/lists/my-lists/resolvers -o resolved.subdomains
}

# see this example on https://github.com/pdelteil/BugBountyHuntingScripts/blob/main/bbrf_helper.sh
# thanks for this

bbrfAddDomainsAndUrls() {
  for p in $(bbrf programs); do
    bbrf scope in -p "$p" |
      subfinder -silent |
      dnsx -silent |
      bbrf domain add - -s subfinder --show-new -p "$p" |
      grep -v DEBUG | notify -silent

    bbrf urls -p "$p" | httpx -silent | bbrf url add - -s httpx --show-new -p "$p" |
      grep -v DEBUG | notify -silent
  done
}
bbrfresolvedomains() {
  for p in $(bbrf programs); do
    bbrf domains --view unresolved -p $p |
      dnsx -silent -a -resp | tr -d '[]' | tee \
      >(awk '{print $1":"$2}' | bbrf domain update - -p $p -s dnsx) \
      >(awk '{print $1":"$2}' | bbrf domain add - -p $p -s dnsx) \
      >(awk '{print $2":"$1}' | bbrf ip add - -p $p -s dnsx) \
      >(awk '{print $2":"$1}' | bbrf ip update - -p $p -s dnsx)
  done
}

getdata() {
  echo "[+] Get all responses and save on roots folder"
  [ -s "ALLHTTP" ] && httpx -l ALLHTTP -srd "AllHttpData" 
}

getdatawithcrawl() {
  echo "[+] Get all responses and save on roots folder"
  [ -s "200HTTP" ] && katana -jc -d 3 -rd 5 -u 200HTTP -o crawldata
  [ -s "crawldata" ] && httpx -l crawldata -srd "200HttpData" 

}

graphqldetect() {
  echo "[+] Graphql Detect"
  cat ALLHTTP | nuclei -id graphql-detect -H $UserAgent -o graphqldetect
  [ -s "graphqldetect" ] && echo "Graphql endpoint found :)" | notify -silent -id api
  [ -s "graphqldetect" ] && notify -silent -bulk -data graphqldetect -id api

}

ssrfdetect() {
  echo "[+] SSRF Detect"
  cat ALLHTTP | nuclei -tags ssrf -H $UserAgent -o ssrfdetect
  [ -s "ssrfdetect" ] && echo "SSRF vector found :)" | notify -silent -id nuclei
  [ -s "ssrfdetect" ] && notify -silent -bulk -data ssrfdetect -id nuclei
}

XssScan() {
  echo "[+] XSS scan"
  cat ALLHTTP | nuclei -tags xss -es info -H $UserAgent -o xssnuclei
  [ -s "xssnuclei" ] && echo "XSS vector found :)" | notify -silent -id xss
  [ -s "xssnuclei" ] && notify -silent -bulk -data xssnuclei -id xss
}

OpenRedirectScan() {
  echo "[+] OpenRedirect scan"
  cat ALLHTTP | nuclei -tags redirect -es info -H $UserAgent -o openredirectVector
  [ -s "openredirectVector" ] && echo "OpenRedirect vector found :)" | notify -silent -id nuclei
  [ -s "openredirectVector" ] && cat openredirectVector | notify -silent -id nuclei
}

swaggerUIdetect() {
  echo "[+] Swagger detect"
  [ -s "ALLHTTP" ] && cat ALLHTTP | nuclei -tags swagger -H $UserAgent -o swaggerUI
  [ -s "swaggerUI" ] && echo "Swagger endpoint found :)" | notify -silent -id api
  [ -s "swaggerUI" ] && notify -silent -bulk -data swaggerUI -id api
}

APIRecon() {
  echo "[+] api detect"
  [ -s "ALLHTTP" ] && cat ALLHTTP | nuclei -w ~/custom_nuclei_templates/api-recon-workflow.yaml -H $UserAgent -o nucleiapirecon
  [ -s "nucleiapirecon" ] && echo "api endpoint found :)" | notify -silent -id api
  [ -s "nucleiapirecon" ] && cat nucleiapirecon | notify -silent -id api
}

prototypefuzz() {
  echo "Prototype FUZZ" | notify -silent -id subs
  cat ALLHTTP | sed 's/$/\/?__proto__[testparam]=exploit\//' | page-fetch -j 'window.testparam == "exploit"? "[VULNERABLE]" : "[NOT VULNERABLE]"' | sed "s/(//g" | sed "s/)//g" | sed "s/JS //g" | grep "VULNERABLE" | grep -v "NOT" | notify -silent
}

subtakeover() {
  echo "test for posible subdomain-takeover"
  python3 $ToolsPath/takeover/takeover.py -l clean.subdomains -o subtakeover.txt -k -v -t 50
  [ -s "subtakeover.txt" ] && cat subtakeover.txt | notify -silent -id subs
}

dnsrecords() {
  echo "[+] Get dnshistory data"
  mkdir dnshistory
  cat clean.subdomains | dnsx -silent -a -resp-only -o dnsx.txt
  cat clean.subdomains | dnsx -a -resp -silent -o dnshistory/A-records
  cat clean.subdomains | dnsx -ns -resp -silent -o dnshistory/NS-records
  cat clean.subdomains | dnsx -cname -resp -silent -o dnshistory/CNAME-records
  cat clean.subdomains | dnsx -soa -resp -silent -o dnshistory/SOA-records
  cat clean.subdomains | dnsx -ptr -resp -silent -o dnshistory/PTR-records
  cat clean.subdomains | dnsx -mx -resp -silent -o dnshistory/MX-records
  cat clean.subdomains | dnsx -txt -resp -silent -o dnshistory/TXT-records
  cat clean.subdomains | dnsx -aaaa -resp -silent -o dnshistory/AAAA-records
}

screenshot() {
  echo "[+] Begin screenshots"
  cat ALLHTTP | aquatone -chrome-path /snap/bin/chromium -scan-timeout 900 -http-timeout 6000 -out aqua_out -ports xlarge
}

crawler() {
  echo 'Crawler in action :)'
  Domain=$(cat domains)
  mdkir -p .tmp
  gospider -S Without404 -d 10 -c 20 -t 50 -K 3 --no-redirect --js -a -w --blacklist ".(eot|jpg|jpeg|gif|css|tif|tiff|png|ttf|otf|woff|woff2|ico|svg|txt)" --include-subs -q -o .tmp/gospider 2>/dev/null | anew -q gospider_out
  xargs -a Without404 -P 50 -I % bash -c "echo % | waybackurls" 2>/dev/null | anew -q waybackurls_out
  xargs -a Without404 -P 50 -I % bash -c "echo % | gau --blacklist eot,jpg,jpeg,gif,css,tif,tiff,png,ttf,otf,woff,woff2,ico,svg,txt --retries 3 --threads 50" 2>/dev/null | anew -q gau_out 2>/dev/null &>/dev/null
  katana -list Without404 -d 2 -ef eot,jpg,jpeg,gif,css,tif,tiff,png,ttf,otf,woff,woff2,ico,svg,txt -output katana_output.txt
  cat gospider_out gau_out waybackurls_out katana_output.txt 2>/dev/null | sed '/\[/d' | grep $Domain | sort -u | uro | anew -q crawlerResults.txt
}

massALLHTTPWebCaching() {
  find /root/Recon -type f -name ALLHTTP | xargs -I{} -P2 bash -c 'cat {}' | anew allhttpalive
  cat allhttpalive | nuclei -t /root/cache-poisoning.yaml -o webcachingTest
  [ -s "webcachingTest" ] && cat webcachingTest | notify -silent -id nuclei
}

xsshunter() {

  echo "INIT XSS HUNTER" | notify -silent -id xss
  echo "INIT XSS HUNTER"
  # python3 $HOME/Tools/xnLinkFinder/xnLinkFinder.py -vv -d 2 -i 200HTTP -sp 200HTTP -sf domains -o urldump.txt
  for domain in $(cat domains); do
    python3 $HOME/Tools/Waymore/waymore.py -i $domain -mode U
    cat $HOME/Tools/Waymore/results/$domain/waymore.txt | awk '{print tolower($0)}' | anew urldump.txt
  done
  [ -s "urldump.txt" ] && cat urldump.txt | uro | kxss | awk '{print $0}' | anew xssvector
  [ -s "urldump.txt" ] && cat urldump.txt | uro | gf xss | httpx -silent | anew xssvector
  # [ -s "xssvector.txt" ] && dalfox file xssvector.txt --skip-bav -o XSSresult
  # [ -s "XSSresult" ] && cat XSSresult | notify -id xss
  echo '[+] Airixss xss'
  [ -s "xssvector" ] && cat xssvector | qsreplace '"><svg onload=confirm(1)>' | airixss -payload "confirm(1)" | egrep -v 'Not' | anew airixss.txt
  [ -s "airixss.txt" ] notify -silent -bulk -data airixss.txt -id xss
  echo '[+] Freq xss'
  [ -s "xssvector" ] && cat xssvector | qsreplace '"><img src=x onerror=alert(1);>' | freq | egrep -v 'Not' | anew FreqXSS.txt
  [ -s "FreqXSS.txt" ] && notify -silent -bulk -data FreqXSS.txt -id xss
  [ -s "xssvector" ] && python3 $HOME/Tools/XSStrike-Reborn/xsstrike.py -ul xssvector -d 2 --file-log-level WARNING --log-file XSStrike_output.log
  [ -s "XSStrike_output.log"] && notify -silent -data XSStrike_output.lo -bulk -id xss
}

bypass4xx() {
  [ -s "403HTTP" ] && cat 403HTTP | dirdar -only-ok | anew dirdarResult.txt
  [ -s "dirdarResult.txt" ] && cat dirdarResult.txt | sed -e '1,12d' | sed '/^$/d' | anew 4xxbypass.txt | notify -silent -id subs
}

paramspider() {
  xargs -a ALLHTTP -I@ sh -c 'python3 /root/Tools/ParamSpider/paramspider.py -d @ -l high --exclude jpg,png,gif,woff,css,js,svg,woff2,ttf,eot,json'
  cat output/http:/*.txt | anew params
  cat output/https:/*.txt | anew params
}

xssknox() {
  [ -s "waybackdata" ] && cat waybackdata | uro | kxss | awk '{print $9}' | anew kxssresult
  [ -s "kxssresult" ] && python3 $HOME/Tools/knoxnl/knoxnl.py -i kxssresult -s -o xssSuccess
  [ -s "xssSuccess" ] && echo "XSS FOUND WITH KNOXSS" | notify -silent -id xss
  [ -s "xssSuccess" ] && notify -silent -bulk -data xssSucess -id xss
}

scanPortsAndNuclei() {
  echo '[+] Recon Blocks Mapcidr'
  mapcidr -l dnsx.txt -silent -aggregate -o mapcidr.txt

  echo '[+] Recon Naabu'
  naabu -l mapcidr.txt -top-ports 100 -silent -sa | httpx -silent -timeout 60 -threads 100 -o naabuIP.txt

  #echo [+] Enumerate dns Mapcidr
  #cat dnsxdomains.txt | mapcidr -aggregate -o mapcidr.txt

  echo '[+] Enumerate httpx nuclei'
  cat naabuIP.txt | nuclei -silent -o nuclei.txt -severity low,medium,high,critical
  [ -s "nuclei.txt" ] && notify -silent -buld -data nuclei.txt -id nuclei
}

massHakip2host() {
  echo "[+] Mass HakIP2host"
  Domain=$(cat domain)
  rush -i mapcidr.txt "prips {} | hakip2host | anew hakip2hostResult.txt"
  [ -s "hakip2hostResult.txt" ] && cat "hakip2hostResult.txt" | grep $Domain | awk '{print $3}' | anew cleanHakipResult.txt
}

nucauto() {
  [ -s "cleanHakipResult.txt" ] && cat "cleanHakipResult.txt" | httpx -silent | anew ALLHTTP
  cat ALLHTTP | nuclei -H $UserAgent -eid expired-ssl,mismatched-ssl,deprecated-tls,weak-cipher-suites,self-signed-ssl -severity critical,high,medium,low -o resultNuclei
  [ -s "resultNuclei" ] && notify -silent -bulk -data resultNuclei -id nuclei
}

faviconEnum() {
  echo '[+] Enumerate FavFreak'
  cat 200HTTP | python3 /root/Tools/FavFreak/favfreak.py --shodan -o outputFavFreak
}

getjsurls() {
  echo "[+]Get JS and test live endpoints"
  [ -s "crawlerResults.txt" ] && cat crawlerResults.txt | grep $Domain | grep -Ei "\.(js)" | grep -iEv '(\.jsp|\.json)' | anew -q url_extract_js.txt
  [ -s "url_extract_js" ] && cat url_extract_js.txt | cut -d '?' -f 1 | grep -Ei "\.(js)" | grep -iEv '(\.jsp|\.json)' | grep $Domain | anew -q jsfile_links.txt
  [ -s "ALLHTTP" ] && cat ALLHTTP | subjs | grep $Domain | anew -q jsfile_links.txt
  [ -s "ALLHTTP" ] && cat ALLHTTP | getJS --complete | grep $Domain | anew -q jsfile_links.txt
  [ -s "jsfile_links.txt" ] && cat jsfile_links.txt | httpx -follow-redirects -random-agent -silent -status-code -retries 2 -no-color | grep 200 | grep -v 301 | cut -d " " -f 1 | anew -q js_livelinks.txt
  [ -s "jsfile_links.txt" ] && cat js_livelinks.txt | fff -d 1 -S -o JSroots
}

getjsdata() {
  [ -s "js_livelinks.txt" ] && cat js_livelinks.txt | nuclei -tags exposure,token -o jsinfo
  [ -s "jsinfo" ] && notify -silent -bulk -data jsinfo -id nuclei
}

secretfinder() {
  echo '[+] Run secretfinder'
  regexs=$(curl -s 'https://gist.githubusercontent.com/mswell/1070fae0021b08d5e5650743ea402b4b/raw/589e669dec183009f01eca2c2ef1401b5f77af2b/regexJS' | tr '\n' '|')
  rush -i js_livelinks.txt 'python3 /root/Tools/SecretFinder/SecretFinder.py -i {} -o cli -r "\w+($regexs)\w+" | grep -v custom_regex | anew js_secrets_result'
  cat js_secrets_result | grep -v custom_regex | grep -iv '[URL]:' | anew JSPathNoUrl
  cat JSPathNoUrl | python3 /root/Tools/BBTz/collector.py JSOutput
}

Corstest() {
  gf cors roots | awk -F '/' '{print $2}' | anew | httpx -silent -o CORSHTTP
  [ -s "CORSHTTP" ] && python3 /root/Tools/CORStest/corstest.py CORSHTTP -q | notify -silent
}

smuggling() {
  cat hosts | rush -j 3 "python3 $ToolsPath/smuggler/smuggler.py -u {}" | tee -a smuggler_op.txt
}

fufapi() {
  ffuf -u $1/FUZZ -w $HOME/Lists/apiwords.txt -mc 200 -t 100
}

fufdir() {
  ffuf -u $1/FUZZ -w $DIRS_LARGE -mc 200,301,302,403 -t 170
}

fufextension() {
  ffuf -u $1/FUZZ -mc 200,301,302,403,401 -t 150 -w $ToolsPath/ffuf_extension.txt -e .php,.asp,.aspx,.jsp,.py,.txt,.conf,.config,.bak,.backup,.swp,.old,.db,.sql,.json,.xml,.log,.zip
}

feroxdir() {
  feroxbuster -u $1 -e --status-codes 200,204,301,307,401,405,400,302 -k -w $HOME/Lists/raft-large-directories-lowercase.txt
}

fleetScan() {

  company=$(cat domains)
  liveHosts=$company-live.txt

  # Start a fleet called stock with 9 instances and expire after 2 hours
  axiom-fleet well -i=

  # Run a scan, use the stok fleet, use the ranges file we just made, and set the ports to 443, then set the output file
  axiom-scan 'well*' --rate=10000 -p443 --banners -iL=clean.subdomains -o=masscanIC.txt

  echo 'Clean file ...'

  cat masscanIC.txt | awk '{print $2}' | grep -v Masscan | grep -v Ports | sort -u | tee $liveHosts
  axiom-scan "well*" -iL=$liveHosts -p443 -sV -sC -T4 -m=nmapx -o=output

  echo 'Remove servers ...'
  axiom-rm "well0*" -f
}

#-------------------------
# INFORMACOES SOBRE FUNCOES
#-------------------------
bb_help() {
  echo "certspotter() - Enumeracao de subdominios a partir de um dominio informado via https://sslmate.com/ct_search_api/"
  echo "-"
}
## FIM
