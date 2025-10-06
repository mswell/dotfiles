#
# Nuclei scanning workflows and functions
#

# Generic Nuclei scanner function to reduce code duplication
# Usage: run_nuclei_scan <output_file> <success_message> <notify_id> <nuclei_args...>
run_nuclei_scan() {
    local output_file="$1"
    local success_message="$2"
    local notify_id="${3:-nuclei}" # Default notify ID is 'nuclei'
    shift 3
    local nuclei_args=($@)

    if [ ! -s "ALLHTTP" ]; then
        echo "${red}[-] ALLHTTP file not found or empty. Skipping scan.${reset}"
        return 1
    fi

    echo "${yellow}[+] Running Nuclei scan: ${success_message}${reset}"
    nuclei -l ALLHTTP -H "$UserAgent" -o "$output_file" "${nuclei_args[@]}"

    if [ -s "$output_file" ]; then
        echo "${green}[+] ${success_message} found! Check file: ${output_file}${reset}" | notify -silent -id "$notify_id"
        notify -silent -bulk -data "$output_file" -id "$notify_id"
    fi
}

# Updates Nuclei templates
# Usage: updateTemplatesNuc
updateTemplatesNuc() {
  echo "${yellow}[+] Updating Nuclei templates...${reset}"
  rm -rf ~/nuclei-templates
  git clone --branch main --depth 1 https://github.com/projectdiscovery/nuclei-templates.git ~/nuclei-templates
}

# Jira vulnerability scan
# Usage: jiraScan
# Requires: ALLHTTP file
# Outputs: jiraNuclei
jiraScan() {
    run_nuclei_scan "jiraNuclei" "Jira vector" "nuclei" -t "$CUSTOM_NUCLEI_TEMPLATES_PATH/ssrf-jira-well.yaml"
}

# Git exposure scan
# Usage: GitScan
# Requires: ALLHTTP file
# Outputs: gitvector
GitScan() {
    run_nuclei_scan "gitvector" "Git vector" "nuclei" -tags git
}

# LFI vulnerability scan
# Usage: lfiScan
# Requires: ALLHTTP file
# Outputs: lfivector
lfiScan() {
    run_nuclei_scan "lfivector" "LFI vector" "nuclei" -tags lfi
}

# Admin panel detection
# Usage: panelNuc
# Requires: ALLHTTP file
# Outputs: nucPanel
panelNuc() {
    run_nuclei_scan "nucPanel" "Admin panel" "nuclei" -tags panel
}

# Exposure detection scan
# Usage: exposureNuc
# Requires: ALLHTTP file
# Outputs: exposurevector
exposureNuc() {
    run_nuclei_scan "exposurevector" "Exposure vector" "nuclei" -tags exposure
}

# Subdomain takeover detection via Nuclei
# Usage: nucTakeover
# Requires: ALLHTTP file
# Outputs: nucleiTakeover, takeovers_m4c
nucTakeover() {
    run_nuclei_scan "nucleiTakeover" "Takeover" "nuclei" -tags takeover
    run_nuclei_scan "takeovers_m4c" "Takeover m4c" "nuclei" -t "$CUSTOM_NUCLEI_TEMPLATES_PATH/m4cddr-takeovers.yaml"
}

# GraphQL endpoint detection
# Usage: graphqldetect
# Requires: ALLHTTP file
# Outputs: graphqldetect
graphqldetect() {
    run_nuclei_scan "graphqldetect" "GraphQL endpoint" "api" -id graphql-detect
}

# SSRF vulnerability detection
# Usage: ssrfdetect
# Requires: ALLHTTP file
# Outputs: ssrfdetect
ssrfdetect() {
    run_nuclei_scan "ssrfdetect" "SSRF vector" "nuclei" -tags ssrf
}

# XSS vulnerability scan via Nuclei
# Usage: XssScan
# Requires: ALLHTTP file
# Outputs: xssnuclei
XssScan() {
    run_nuclei_scan "xssnuclei" "XSS vector" "xss" -tags xss -es info
}

# Open Redirect detection
# Usage: OpenRedirectScan
# Requires: ALLHTTP file
# Outputs: openredirectVector
OpenRedirectScan() {
    run_nuclei_scan "openredirectVector" "OpenRedirect vector" "nuclei" -tags redirect -es info
}

# Swagger UI detection
# Usage: swaggerUIdetect
# Requires: ALLHTTP file
# Outputs: swaggerUI
swaggerUIdetect() {
    run_nuclei_scan "swaggerUI" "Swagger endpoint" "api" -tags swagger
}

# API reconnaissance workflow
# Usage: APIRecon
# Requires: ALLHTTP file
# Outputs: nucleiapirecon
APIRecon() {
    run_nuclei_scan "nucleiapirecon" "API endpoint" "api" -w "$CUSTOM_NUCLEI_TEMPLATES_PATH/api-recon-workflow.yaml"
}

# Mass scan with custom template
# Usage: massALLHTTPtemplate <template_path>
# Requires: ALLHTTP files in RECON_PATH
# Outputs: massALLTEST.txt
massALLHTTPtemplate() {
  find "$RECON_PATH" -type f -name ALLHTTP | xargs -I{} -P2 bash -c 'cat {}' | anew allhttpalive
  nuclei -l allhttpalive -t "$1" -o massALLTEST.txt
  [ -s "massALLTEST.txt" ] && cat massALLTEST.txt | notify -silent
}

# Mass web cache poisoning test
# Usage: massALLHTTPWebCaching
# Requires: ALLHTTP files in RECON_PATH, ~/cache-poisoning.yaml template
# Outputs: webcachingTest
massALLHTTPWebCaching() {
  find "$RECON_PATH" -type f -name ALLHTTP | xargs -I{} -P2 bash -c 'cat {}' | anew allhttpalive
  nuclei -l allhttpalive -t "$HOME/cache-poisoning.yaml" -o webcachingTest
  [ -s "webcachingTest" ] && cat webcachingTest | notify -silent -id nuclei
}

# Auto Nuclei scan on hakip2host results
# Usage: nucauto
# Requires: cleanHakipResult.txt file
# Outputs: ALLHTTP, resultNuclei
nucauto() {
  if [ ! -s "cleanHakipResult.txt" ]; then echo "${red}[-] cleanHakipResult.txt not found or empty.${reset}"; return 1; fi
  httpx -l cleanHakipResult.txt -silent | anew ALLHTTP
  nuclei -l ALLHTTP -H "$UserAgent" -eid expired-ssl,mismatched-ssl,deprecated-tls,weak-cipher-suites,self-signed-ssl -severity critical,high,medium,low -o resultNuclei
  [ -s "resultNuclei" ] && notify -silent -bulk -data resultNuclei -id nuclei
}
