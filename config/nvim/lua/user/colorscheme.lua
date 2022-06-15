vim.cmd [[
try
  let g:dracula_colorterm = 0
  colorscheme dracula
catch /^Vim\%((\a\+)\)\=:E185/
  colorscheme default
  set background=dark
endtry
]]
