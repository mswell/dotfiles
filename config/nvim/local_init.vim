" Writes the content of the file automatically if you call :make
set autowrite

" for html/rb files, 2 spaces
autocmd Filetype html setlocal ts=2 sw=2 expandtab
autocmd Filetype htmldjango setlocal ts=2 sw=2 expandtab
autocmd Filetype jinja setlocal ts=2 sw=2 expandtab
autocmd Filetype css setlocal ts=2 sw=2 expandtab
autocmd Filetype ruby setlocal ts=2 sw=2 expandtab

" Vim commentary
autocmd FileType htmldjango set commentstring={#\ %s\ #}
autocmd FileType jinja set commentstring={#\ %s\ #}

" DelimitMate
let b:delimitMate_expand_cr=1
let b:delimitMate_expand_space=1
let b:delimitMate_expand_inside_quotes=1

" Auto pep8
let g:autopep8_disable_show_diff=1

" Vim Airline
let g:airline_powerline_fonts = 1

" Highlight current line
set cursorline

" Vim-go
let g:go_gocode_unimported_packages = 1
let g:go_metalinter_autosave = 1
au FileType go set foldmethod=syntax
au FileType go set nofoldenable
let g:go_fold_enable = ['block', 'import', 'varconst']
let g:go_decls_mode='fzf'

" Closes buffer and quicklist too
aug QFClose
  au!
  au WinEnter * if winnr('$') == 1 && getbufvar(winbufnr(winnr()), "&buftype") == "quickfix"|q|endif
aug END
  " Ale
  let g:ale_linters = {'go': ['go vet', 'golint'], 'python':['flake8'], 'ruby':['rubocop']}
  let g:ale_lint_on_save = 1
  highlight clear ALEErrorSign
  highlight clear ALEWarningSign
  let g:ale_lint_on_text_changed = 'never'
  nmap <silent> <C-k> <Plug>(ale_previous_wrap)
  nmap <silent> <C-j> <Plug>(ale_next_wrap)

  " set clipboard
  set clipboard=unnamed,unnamedplus
  "
  " Use deoplete.
