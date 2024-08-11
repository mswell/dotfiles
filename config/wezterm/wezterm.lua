local wezterm = require 'wezterm'
return {
	-- color_scheme = 'termnial.sexy',
	-- color_scheme = 'Catppuccin Mocha',
  colors = require("cyberdream"),
	enable_tab_bar = false,
	font_size = 16.0,
	-- font = wezterm.font('ComicCodeLigatures Nerd Font'),
	font = wezterm.font('Geist Mono'),
	-- macos_window_background_blur = 40,
	macos_window_background_blur = 30,
	
	-- window_background_image = '/Users/omerhamerman/Downloads/3840x1080-Wallpaper-041.jpg',
	-- window_background_image_hsb = {
	-- 	brightness = 0.01,
	-- 	hue = 1.0,
	-- 	saturation = 0.5,
	-- },
	window_background_opacity = 0.97,
	-- window_background_opacity = 1.0,
	-- window_background_opacity = 0.78,
	-- window_background_opacity = 0.20,
	window_decorations = 'RESIZE',
  audible_bell = 'Disabled',
	mouse_bindings = {
	  -- Ctrl-click will open the link under the mouse cursor
	  {
	    event = { Up = { streak = 1, button = 'Left' } },
	    mods = 'CTRL',
	    action = wezterm.action.OpenLinkAtMouseCursor,
	  },
	},
}
