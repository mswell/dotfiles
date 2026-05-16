local function current_theme()
  local f = io.open(vim.fn.expand("~/.config/hypr/current-theme"), "r")
  if f then
    local theme = f:read("*l"):gsub("%s+", "")
    f:close()
    return theme
  end
  return "wellpunk-dark"
end

local theme = current_theme()

-- map our theme keys to the nvim colorscheme name registered by the upstream plugin
local colorscheme = ({
  ["wellpunk-dark"]  = "vantablack",
  ["wellpunk-light"] = "white",
  tokyonight         = "tokyonight",
})[theme] or "vantablack"

return {
  { "bjarneo/vantablack.nvim",                priority = 1000 },
  { "bjarneo/white.nvim",                     priority = 1000 },
  { "folke/tokyonight.nvim",                  priority = 1000 },
  {
    "LazyVim/LazyVim",
    opts = { colorscheme = colorscheme },
  },
}
