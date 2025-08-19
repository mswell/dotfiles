# =============================================
#  CENTRAL CONFIGURATION FOR PATHS AND TOOLS
# =============================================
# This file is the single source of truth for paths used
# by both 'install_hacktools.sh' and 'functions.zsh'.

# --- Base Directories ---
export TOOLS_PATH="$HOME/Tools"
export LISTS_PATH="$HOME/Lists"
export RECON_PATH="$HOME/Recon"
export DOTFILES_PATH="$HOME/Projects/dotfiles"

# --- Specific Tool Paths ---
export CUSTOM_NUCLEI_TEMPLATES_PATH="$DOTFILES_PATH/custom_nuclei_templates"
export TAKEOVER_SCRIPT_PATH="$TOOLS_PATH/takeover/takeover.py"
export SECRETFINDER_PATH="$TOOLS_PATH/SecretFinder/SecretFinder.py"
export CORSTEST_PATH="$TOOLS_PATH/CORStest/corstest.py"
export SMUGGLER_PATH="$TOOLS_PATH/smuggler/smuggler.py"
export FAVFREAK_PATH="$TOOLS_PATH/FavFreak/favfreak.py"
export XSSTRIKE_PATH="$TOOLS_PATH/XSStrike-Reborn/xsstrike.py"
export WAYMORE_PATH="$TOOLS_PATH/Waymore/waymore.py"
export KNOXNL_PATH="$TOOLS_PATH/knoxnl/knoxnl.py"
export PARAMSPIDER_PATH="$TOOLS_PATH/ParamSpider/paramspider.py"
export BBTZ_COLLECTOR_PATH="$TOOLS_PATH/BBTz/collector.py"

# --- Wordlists ---
export DIRS_LARGE_LIST="$LISTS_PATH/raft-large-directories-lowercase.txt"
export ALL_TXT_LIST="$LISTS_PATH/all.txt"
export NAMELIST_TXT="$LISTS_PATH/namelist.txt"
export TOP_1M_110K_LIST="$LISTS_PATH/subdomains-top1million-110000.txt"
export API_WORDS_LIST="$LISTS_PATH/apiwords.txt"
export FFUF_EXTENSIONS_LIST="$TOOLS_PATH/ffuf_extension.txt"
export RESOLVERS_LIST="$LISTS_PATH/resolvers.txt"
