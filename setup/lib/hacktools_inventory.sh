#!/usr/bin/env bash
# Inventory for bug bounty/security tools. Planning helpers are side-effect free.

# shellcheck shell=bash

PROJECTDISCOVERY_TOOLS=(naabu shuffledns chaos nuclei notify httpx dnsx subfinder interactsh-client alterx katana)

# Direct go install packages for each PD tool — used instead of pdtm which
# crashes on macOS Apple Silicon due to go-m1cpu@v0.1.6 SIGSEGV via CGo.
PROJECTDISCOVERY_PACKAGES=(
  "naabu|github.com/projectdiscovery/naabu/v2/cmd/naabu"
  "shuffledns|github.com/projectdiscovery/shuffledns/cmd/shuffledns"
  "chaos|github.com/projectdiscovery/chaos-client/cmd/chaos"
  "nuclei|github.com/projectdiscovery/nuclei/v3/cmd/nuclei"
  "notify|github.com/projectdiscovery/notify/cmd/notify"
  "httpx|github.com/projectdiscovery/httpx/cmd/httpx"
  "dnsx|github.com/projectdiscovery/dnsx/cmd/dnsx"
  "subfinder|github.com/projectdiscovery/subfinder/v2/cmd/subfinder"
  "interactsh-client|github.com/projectdiscovery/interactsh/cmd/interactsh-client"
  "alterx|github.com/projectdiscovery/alterx/cmd/alterx"
  "katana|github.com/projectdiscovery/katana/cmd/katana"
)

# Format: binary|go install package
GO_TOOLS=(
  "fff|github.com/tomnomnom/fff"
  "tojson|github.com/tomnomnom/hacks/tojson"
  "Rush|github.com/shenwei356/rush"
  "gron|github.com/tomnomnom/gron"
  "html-tool|github.com/tomnomnom/hacks/html-tool"
  "gf|github.com/tomnomnom/gf"
  "qsreplace|github.com/tomnomnom/qsreplace"
  "Amass|github.com/owasp-amass/amass/v4/..."
  "ffuf|github.com/ffuf/ffuf"
  "assetfinder|github.com/tomnomnom/assetfinder"
  "github-subdomains|github.com/gwen001/github-subdomains"
  "waybackurls|github.com/tomnomnom/hacks/waybackurls"
  "anew|github.com/tomnomnom/anew"
  "dirdar|github.com/m4dm0e/dirdar"
  "unfurl|github.com/tomnomnom/unfurl"
  "gauplus|github.com/bp0lr/gauplus"
  "subjs|github.com/lc/subjs"
  "Gxss|github.com/KathanP19/Gxss"
  "gospider|github.com/jaeles-project/gospider"
  "puredns|github.com/d3mondev/puredns/v2"
  "kxss|github.com/tomnomnom/hacks/kxss"
  "GetJs|github.com/003random/getJS"
  "Meg|github.com/tomnomnom/meg"
  "Freq|github.com/takshal/freq"
  "Sdlookup|github.com/j3ssie/sdlookup"
  "Airixss|github.com/ferreiraklet/airixss"
  "Nilo|github.com/ferreiraklet/nilo"
  "metabigor|github.com/j3ssie/metabigor"
  "sourcemapper|github.com/denandz/sourcemapper"
)

# Format: local directory name|GitHub owner/repo
REPOSITORY_TOOLS=(
  "gf|tomnomnom/gf"
  "Gf-Patterns|1ndianl33t/Gf-Patterns"
  "Interlace|codingo/Interlace"
  "JSScanner|0x240x23elu/JSScanner"
  "GitTools|internetwache/GitTools"
  "SecretFinder|m4ll0k/SecretFinder"
  "M4ll0k|m4ll0k/BBTz"
  "Git-Dumper|arthaud/git-dumper"
  "Knock|guelfoweb/knock"
  "Massdns|blechschmidt/massdns"
  "MSwellDOTS|mswell/dotfiles"
  "Waymore|xnl-h4ck3r/waymore"
  "altdns|infosec-au/altdns"
)

# Format: destination variable-or-path|source URL
WORDLISTS=(
  "\$LISTS_PATH/raft-large-directories-lowercase.txt|https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/raft-large-directories-lowercase.txt"
  "\$LISTS_PATH/raft-large-files.txt|https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/raft-large-files.txt"
  "\$LISTS_PATH/raft-large-words-lowercase.txt|https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/raft-large-words-lowercase.txt"
  "\$NAMELIST_TXT|https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/DNS/namelist.txt"
  "\$LISTS_PATH/directory-list-2.3-small.txt|https://raw.githubusercontent.com/danielmiessler/SecLists/refs/heads/master/Discovery/Web-Content/DirBuster-2007_directory-list-2.3-small.txt"
  "\$LISTS_PATH/web-extensions.txt|https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/web-extensions.txt"
  "\$LISTS_PATH/subdomains-top1million-5000.txt|https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/DNS/subdomains-top1million-5000.txt"
  "\$LISTS_PATH/burp-parameter-names.txt|https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/burp-parameter-names.txt"
  "\$LISTS_PATH/xato-net-10-million-usernames.txt|https://raw.githubusercontent.com/danielmiessler/SecLists/master/Usernames/xato-net-10-million-usernames.txt"
  "\$TOP_1M_110K_LIST|https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/DNS/subdomains-top1million-110000.txt"
  "\$LISTS_PATH/raft-large-words.txt|https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/raft-large-words.txt"
  "\$LISTS_PATH/dirsearch-dicc.txt|https://raw.githubusercontent.com/maurosoria/dirsearch/master/db/dicc.txt"
  "\$ALL_TXT_LIST|https://gist.githubusercontent.com/jhaddix/86a06c5dc309d08580a018c66354a056/raw/96f4e51d96b2203f19f6381c8c545b278eaa0837/all.txt"
)

hacktools_expand_path() {
    local raw="$1"
    eval "printf '%s' \"$raw\""
}

hacktools_projectdiscovery_csv() {
    local IFS=,
    printf '%s\n' "${PROJECTDISCOVERY_TOOLS[*]}"
}

hacktools_inventory_plan() {
    local item
    local pd_tool pd_package
    local go_tool go_package
    local wordlist_dest wordlist_url
    local repo_name github_repo repo_path
    local recursive_list_path

    printf 'path|directory|TOOLS_PATH|%s\n' "${TOOLS_PATH:-}"
    printf 'path|directory|LISTS_PATH|%s\n' "${LISTS_PATH:-}"
    printf 'path|directory|RECON_PATH|%s\n' "${RECON_PATH:-}"

    for item in "${PROJECTDISCOVERY_PACKAGES[@]}"; do
        IFS='|' read -r pd_tool pd_package <<< "$item"
        printf 'go_install|projectdiscovery|%s|%s@latest\n' "$pd_tool" "$pd_package"
    done

    for item in "${GO_TOOLS[@]}"; do
        IFS='|' read -r go_tool go_package <<< "$item"
        printf 'go_install|generic|%s|%s@latest\n' "$go_tool" "$go_package"
    done

    printf 'python_install|pip_user|uro|uro\n'

    for item in "${WORDLISTS[@]}"; do
        IFS='|' read -r wordlist_dest wordlist_url <<< "$item"
        printf 'wordlist_download|%s|%s\n' "$(hacktools_expand_path "$wordlist_dest")" "$wordlist_url"
    done

    for item in "${REPOSITORY_TOOLS[@]}"; do
        IFS='|' read -r repo_name github_repo <<< "$item"
        repo_path="$TOOLS_PATH/$repo_name"
        printf 'repo_sync|%s|%s|https://github.com/%s\n' "$repo_name" "$repo_path" "$github_repo"
    done

    recursive_list_path="${RECURSIVE_LIST:-$LISTS_PATH/recursive.txt}"
    printf 'post_install|gf_templates|copy_gf_templates|%s\n' "$HOME/.gf"
    printf 'post_install|recursive_wordlist|generate_recursive_wordlist|%s\n' "$recursive_list_path"
}

hacktools_download_wordlists() {
    local item raw_dest url dest
    for item in "${WORDLISTS[@]}"; do
        IFS='|' read -r raw_dest url <<< "$item"
        dest="$(hacktools_expand_path "$raw_dest")"
        if [[ ! -f "$dest" ]]; then
            wget -nc -O "$dest" "$url"
        fi
    done
}
