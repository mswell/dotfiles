local wezterm = require("wezterm")

return {
	window_background_opacity = 0.98,
	font_size = 16,
	hide_tab_bar_if_only_one_tab = true,
	color_scheme = "Catppuccin Mocha", -- or Macchiato, Frappe, Latte
	font = wezterm.font("FantasqueSansM Nerd Font"),
	default_cursor_style = "BlinkingBar",
	adjust_window_size_when_changing_font_size = false,
}
