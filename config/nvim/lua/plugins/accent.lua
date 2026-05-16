-- Indigo accent overrides for wellpunk-dark / wellpunk-light themes.
-- The base colorschemes are intentionally monochrome; this layer paints the
-- 10% accent (keywords, functions, cursor line nr, visual, telescope borders,
-- statusline mode) in indigo to match wellpunk.dev.

local palettes = {
  ["wellpunk-dark"] = {
    accent      = "#6366f1", -- indigo-500
    accent_soft = "#818cf8", -- indigo-400
    visual_bg   = "#1e1b4b", -- indigo-950
    sign_bg     = "NONE",
  },
  ["wellpunk-light"] = {
    accent      = "#4f46e5", -- indigo-600
    accent_soft = "#6366f1", -- indigo-500
    visual_bg   = "#e0e7ff", -- indigo-100
    sign_bg     = "NONE",
  },
}

local function apply(p)
  local set = function(group, opts) vim.api.nvim_set_hl(0, group, opts) end

  -- Keywords / control flow → primary accent
  for _, g in ipairs({
    "Keyword", "Conditional", "Repeat", "Statement", "Exception",
    "@keyword", "@keyword.function", "@keyword.return", "@keyword.operator",
    "@conditional", "@repeat", "@exception",
  }) do set(g, { fg = p.accent, bold = true }) end

  -- Functions → soft accent (less dominant than keywords)
  for _, g in ipairs({
    "Function", "@function", "@function.call", "@method", "@method.call",
    "@constructor",
  }) do set(g, { fg = p.accent_soft }) end

  -- Focus / cursor / selection
  set("CursorLineNr",   { fg = p.accent, bold = true })
  set("Visual",         { bg = p.visual_bg })
  set("VisualNOS",      { bg = p.visual_bg })
  set("Search",         { fg = p.accent, bold = true, underline = true })
  set("IncSearch",      { fg = "#000000", bg = p.accent })
  set("MatchParen",     { fg = p.accent, bold = true })

  -- Telescope / floating borders
  for _, g in ipairs({
    "FloatBorder", "TelescopeBorder", "TelescopePromptBorder",
    "TelescopeResultsBorder", "TelescopePreviewBorder",
    "TelescopeSelection", "TelescopeMatching",
  }) do set(g, { fg = p.accent }) end
  set("TelescopePromptPrefix",  { fg = p.accent })

  -- Statusline mode pill (lualine reads these for the 'auto' theme via mode hl)
  set("lualine_a_normal",  { fg = "#ffffff", bg = p.accent, bold = true })
  set("lualine_a_insert",  { fg = "#ffffff", bg = p.accent_soft, bold = true })
  set("lualine_a_visual",  { fg = "#ffffff", bg = p.accent, bold = true })

  -- Diagnostics / git signs keep their semantic colors; only "info" becomes indigo
  set("DiagnosticInfo",          { fg = p.accent })
  set("DiagnosticVirtualTextInfo", { fg = p.accent })

  -- Pmenu selection (completion)
  set("PmenuSel",       { fg = "#ffffff", bg = p.accent, bold = true })
  set("PmenuThumb",     { bg = p.accent })
end

local function current_theme()
  local f = io.open(vim.fn.expand("~/.config/hypr/current-theme"), "r")
  if not f then return "wellpunk-dark" end
  local t = f:read("*l"):gsub("%s+", "")
  f:close()
  return t
end

vim.api.nvim_create_autocmd("ColorScheme", {
  group = vim.api.nvim_create_augroup("IndigoAccent", { clear = true }),
  callback = function()
    local p = palettes[current_theme()]
    if p then apply(p) end
  end,
})

return {}
