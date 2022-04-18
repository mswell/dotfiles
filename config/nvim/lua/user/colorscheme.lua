vim.cmd [[
try
  colorscheme dracula_pro
catch /^Vim\%((\a\+)\)\=:E185/
  colorscheme default
  set background=dark
endtry
]]
