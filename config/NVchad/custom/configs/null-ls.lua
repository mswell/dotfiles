local null_ls = require "null-ls"

local formatting = null_ls.builtins.formatting
local lint = null_ls.builtins.diagnostics
local diagnostics = null_ls.builtins.diagnostics

local sources = {
   formatting.prettier,
   formatting.stylua,
   formatting.black,

   lint.shellcheck,

   diagnostics.flake8,
}

null_ls.setup {
   debug = true,
   sources = sources,
}
