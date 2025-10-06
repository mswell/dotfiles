#
# Infrastructure and DNS reconnaissance functions
#

# Gets comprehensive DNS records for all subdomains
# Usage: dnsrecords
# Requires: clean.subdomains file
# Outputs: dnsx.txt, dnshistory/* files
dnsrecords() {
  echo "${yellow}[+] Getting DNS records...${reset}"
  if [ ! -s "clean.subdomains" ]; then echo "${red}[-] clean.subdomains not found or empty.${reset}"; return 1; fi
  mkdir -p dnshistory
  dnsx -l clean.subdomains -silent -a -resp-only -o dnsx.txt
  dnsx -l clean.subdomains -a -resp -silent -o dnshistory/A-records
  dnsx -l clean.subdomains -ns -resp -silent -o dnshistory/NS-records
  dnsx -l clean.subdomains -cname -resp -silent -o dnshistory/CNAME-records
  dnsx -l clean.subdomains -soa -resp -silent -o dnshistory/SOA-records
  dnsx -l clean.subdomains -ptr -resp -silent -o dnshistory/PTR-records
  dnsx -l clean.subdomains -mx -resp -silent -o dnshistory/MX-records
  dnsx -l clean.subdomains -txt -resp -silent -o dnshistory/TXT-records
  dnsx -l clean.subdomains -aaaa -resp -silent -o dnshistory/AAAA-records
}
