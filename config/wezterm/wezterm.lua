local wezterm = require("wezterm")

local config = {}

if wezterm.config_builder then
	config = wezterm.config_builder()
end

local fonts = {
	-- "MonoLisa",
	"Geist Mono",
	"SF Mono",
	"Monaspace Neon",
	"Monaspace Xenon",
	"Monaspace Krypton",
	"Monaspace Radon",
	"Monaspace Argon",
	"Comic Code Ligatures",
	-- "Liga SFMono Nerd Font",
	-- "Fira Code Retina",
	-- "DankMono Nerd Font",
	-- "Monego Ligatures",
	-- "Operator Mono Lig",
	-- "Gintronic",
	-- "Cascadia Code",
	-- "JetBrainsMono Nerd Font Mono",
	-- "Victor Mono",
	-- "Inconsolata",
	-- "TempleOS",
	-- "Apercu Pro",
}
local emoji_fonts = {
	"Apple Color Emoji",
	"Joypixels",
	"Twemoji",
	"Noto Color Emoji",
	"Noto Emoji",
}

-- https://www.monolisa.dev/playground
-- https://fontdrop.info/#/?darkmode=true
-- https://helpx.adobe.com/fonts/using/open-type-syntax.html
-- SF Mono
-- config.harfbuzz_features =
-- 	{ "-c2sc", "liga", "ccmp", "locl", "-smcp", "-ss03", "-ss04", "ss05", "ss06", "ss07", "-ss08", "-ss09" }
-- Fira Code
-- https://github.com/tonsky/FiraCode/wiki/How-to-enable-stylistic-sets
-- config.harfbuzz_features = { "cv01", "cv02", "cv06", "cv10", "cv13", "ss01", "ss04", "ss05", "ss02" }
-- monaspace
-- config.harfbuzz_features =
-- 	{ "calt", "liga", "dlig", "zero", "ss01", "ss02", "ss03", "ss04", "ss05", "ss06", "ss07", "ss08" }
-- geist /> === // 0O
-- config.harfbuzz_features =
-- 	{ "calt", "liga", "dlig", "zero", "ss01", "ss02", "ss03", "ss04", "ss05", "ss06", "ss07", "ss08", "-ss09" }
-- monolisa
-- @ <=0xF \\ \n
config.harfbuzz_features = {
	"calt",
	"liga",
	"zero",
	"-ss01",
	"ss02",
	"-ss03",
	"ss04",
	"ss05",
	"-ss06",
	"-ss07",
	"-ss08",
	"-ss09",
	"ss10",
	"ss11",
	"ss12",
	"-ss13",
	"ss14",
	"ss15",
	"ss16",
	"ss17",
	"ss18",
}
config.font = wezterm.font_with_fallback({ fonts[1], emoji_fonts[1], emoji_fonts[2] })
-- config.disable_default_key_bindings = true
config.front_end = "WebGpu"
config.enable_scroll_bar = false
config.scrollback_lines = 10240
config.font_size = 16
config.enable_tab_bar = false
config.hide_tab_bar_if_only_one_tab = false
config.automatically_reload_config = true
config.default_cursor_style = "BlinkingBar"
config.initial_cols = 80
config.initial_rows = 25
config.use_fancy_tab_bar = true
config.tab_bar_at_bottom = false
-- config.window_decorations = "RESIZE|TITLE"
-- config.window_decorations = "INTEGRATED_BUTTONS|RESIZE"
config.window_padding = {
	left = 30,
	right = 30,
	top = 30,
	bottom = 30,
}
config.window_frame = {
	font = wezterm.font({ family = "SF Mono" }),
	-- font = wezterm.font({ family = "Geist Mono" }),
	active_titlebar_bg = "#1a1b26",
	inactive_titlebar_bg = "#1a1b26",
	font_size = 15.0,
}

config.color_schemes = {
	["TokyoNightCustom"] = {
		foreground = "#c0caf5",
		background = "#1a1b26",
		cursor_bg = "#c0caf5",
		cursor_fg = "#1a1b26",
		cursor_border = "#c0caf5",
		selection_fg = "#c0caf5",
		selection_bg = "#283457",
		scrollbar_thumb = "#292e42",
		split = "#7aa2f7",
		ansi = { "#15161e", "#f7768e", "#9ece6a", "#e0af68", "#7aa2f7", "#bb9af7", "#7dcfff", "#a9b1d6" },
		brights = { "#414868", "#ff899d", "#9fe044", "#faba4a", "#8db0ff", "#c7a9ff", "#a4daff", "#c0caf5" },
	},
}
config.color_scheme = "TokyoNightCustom"
-- local act = wezterm.action
config.window_background_opacity = 0.97

-- config.keys = {
-- 	{ key = "a", mods = "ctrl", action = act.ActivateTabRelative(-1) },
-- 	{ key = "b", mods = "ctrl", action = act.ActivateTabRelative(1) },
-- }

return config
