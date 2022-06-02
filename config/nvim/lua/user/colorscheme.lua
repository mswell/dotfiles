vim.cmd [[
packadd! dracula_pro
try
  let g:dracula_colorterm = 0
  colorscheme dracula_pro
catch /^Vim\%((\a\+)\)\=:E185/
  colorscheme default
  set background=dark
endtry
]]
