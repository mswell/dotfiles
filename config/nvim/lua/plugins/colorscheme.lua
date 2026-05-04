local function current_theme()
  local f = io.open(vim.fn.expand("~/.config/hypr/current-theme"), "r")
  if f then
    local theme = f:read("*l"):gsub("%s+", "")
    f:close()
    return theme
  end
  return "vantablack"
end

local theme = current_theme()

return {
  { "bjarneo/vantablack.nvim", priority = 1000 },
  { "bjarneo/white.nvim",      priority = 1000 },
  {
    "LazyVim/LazyVim",
    opts = { colorscheme = theme },
  },
}
