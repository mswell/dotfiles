local plugins = {
  { 'Exafunction/codeium.vim', lazy = false },
  {
    "nvim-treesitter/nvim-treesitter",
    opts = {
      ensure_installed = {
        -- defaults 
        "vim",
        "lua",
        "bash",

        -- web dev 
        "html",
        "python",
        "go",
        "rust",
        "graphql",
        "css",
        "javascript",
        "typescript",
        "tsx",
        "json",
        -- "vue", "svelte",

       -- low level
        "c",
        "rust",
        "zig"
      },
    },
  },
  {
  "neovim/nvim-lspconfig",
   config = function()
      require "plugins.configs.lspconfig"
      require "custom.configs.lspconfig"
   end,
  },
  -- {
  -- "neovim/nvim-lspconfig",
  --
  --  dependencies = {
  --    "jose-elias-alvarez/null-ls.nvim",
  --    config = function()
  --      require "custom.configs.null-ls"
  --    end,
  --  },
  --
  --  config = function()
  --     require "plugins.configs.lspconfig"
  --     require "custom.configs.lspconfig"
  --  end,
  -- },
   {
   "williamboman/mason.nvim",
   opts = {
      ensure_installed = {
        "lua-language-server",
        "html-lsp",
        "prettier",
        "stylua",
        "pyright",
      },
    },
  }
}

return plugins
