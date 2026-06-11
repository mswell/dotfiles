-- Hyprland Lua config — source of truth (Hyprland 0.55+)
-- Theme colors loaded from symlink managed by theme-switch.sh

local home = os.getenv("HOME")
local colors = dofile(home .. "/.config/hypr/colors.lua")


--------------------
---- MONITORS ------
--------------------

-- Fallback for any unrecognized monitor
hl.monitor({ output = "", mode = "preferred", position = "auto", scale = "1" })

-- Setup: notebook only / HDMI externo (direita)
hl.monitor({ output = "eDP-1", mode = "1920x1200@60", position = "0x0", scale = "1" })
hl.monitor({ output = "HDMI-A-1", mode = "1920x1080@60", position = "1920x0", scale = "1" })

-- Setup: casa (DP-3 principal, DP-2 vertical esquerda)
-- DP-2 rotacionado (transform 1) fica com tamanho lógico 1080x1920.
-- DP-3 fica à direita em x=1080 e y=420 para alinhar o centro vertical.
hl.monitor({ output = "DP-3", mode = "1920x1080@144", position = "1080x420", scale = "1" })
hl.monitor({ output = "DP-2", mode = "1920x1080@120", position = "0x0", scale = "1", transform = 1 })

local mainMonitor = "HDMI-A-1"
local secondaryMonitor = "eDP-1"

hl.workspace_rule({ workspace = "1", monitor = mainMonitor, default = true })
hl.workspace_rule({ workspace = "2", monitor = mainMonitor, default = true })
hl.workspace_rule({ workspace = "6", monitor = secondaryMonitor, default = true })


---------------------
---- MY PROGRAMS ----
---------------------

local terminal    = "kitty"
local fileManager = "nautilus"
local menu        = "walker"
local browser     = "google-chrome-stable --new-window --enable-features=UseOzonePlatform --ozone-platform=wayland"
local notes       = "obsidian"
local passwordManager = "proton-pass"
local webapp      = browser .. " --app"
local editor      = "code"


-------------------
---- AUTOSTART ----
-------------------

-- exec-once equivalent: runs commands once on Hyprland startup
hl.on("hyprland.start", function()
    hl.exec_cmd("systemctl --user start hyprpolkitagent")
    hl.exec_cmd("mako")
    hl.exec_cmd("waybar")
    hl.exec_cmd("wpaperd -d")
    hl.exec_cmd("elephant")
    hl.exec_cmd("walker --gapplication-service")
    hl.exec_cmd("wl-paste --type text --watch cliphist store")
    hl.exec_cmd("wl-paste --type image --watch cliphist store")
    hl.exec_cmd("hypridle")
    -- Workaround: Hyprland 0.55 às vezes calcula bounds do cursor errado
    -- em boot com DP-2 rotacionado (transform=1). Um reload após 2s recalcula.
    hl.exec_cmd("sleep 2 && hyprctl reload")
    hl.exec_cmd("dbus-update-activation-environment --systemd WAYLAND_DISPLAY XDG_CURRENT_DESKTOP")
    hl.exec_cmd("nm-applet")
    hl.exec_cmd("hyprswitch init --show-title")
end)


-------------------------------
---- ENVIRONMENT VARIABLES ----
-------------------------------

hl.env("XCURSOR_SIZE", "24")
hl.env("XCURSOR_THEME", colors.cursor_theme)
hl.env("HYPRCURSOR_SIZE", "24")
hl.env("HYPRCURSOR_THEME", colors.cursor_theme)

-- Nvidia
hl.env("LIBVA_DRIVER_NAME", "nvidia")
hl.env("XDG_SESSION_TYPE", "wayland")
hl.env("GBM_BACKEND", "nvidia-drm")
hl.env("__GLX_VENDOR_LIBRARY_NAME", "nvidia")
hl.env("NVD_BACKEND", "direct")
hl.env("ELECTRON_OZONE_PLATFORM_HINT", "auto")

-- QT
hl.env("QT_QPA_PLATFORM", "wayland;xcb")
hl.env("QT_QPA_PLATFORMTHEME", "qt5ct")
hl.env("QT_WAYLAND_DISABLE_WINDOWDECORATION", "1")
hl.env("QT_AUTO_SCREEN_SCALE_FACTOR", "1")
hl.env("QT_STYLE_OVERRIDE", "kvantum")

-- Toolkit Backend
hl.env("GDK_BACKEND", "wayland,x11,*")
hl.env("SDL_VIDEODRIVER", "wayland")
hl.env("CLUTTER_BACKEND", "wayland")

-- XDG
hl.env("XDG_CURRENT_DESKTOP", "Hyprland")
hl.env("XDG_SESSION_DESKTOP", "Hyprland")


hl.config({
    xwayland = {
        force_zero_scaling = true,
    },
})


-----------------------
---- LOOK AND FEEL ----
-----------------------

hl.config({
    general = {
        gaps_in     = 5,
        gaps_out    = 5,
        border_size = 2,

        col = {
            active_border   = { colors = {colors.active_border_1, colors.active_border_2}, angle = 45 },
            inactive_border = colors.inactive_border,
        },

        resize_on_border = true,
        allow_tearing    = false,
        layout           = "dwindle",
    },

    decoration = {
        rounding         = 10,
        active_opacity   = 1.0,
        inactive_opacity = 1.0,

        blur = {
            enabled          = true,
            size             = 3,
            passes           = 1,
            new_optimizations = true,
            vibrancy         = 0.1696,
            ignore_opacity   = true,
        },
    },

    animations = {
        enabled = true,
    },
})

-- Bezier curves
hl.curve("easeOutQuint",   { type = "bezier", points = { {0.23, 1},    {0.32, 1}    } })
hl.curve("easeInOutCubic", { type = "bezier", points = { {0.65, 0.05}, {0.36, 1}    } })
hl.curve("linear",         { type = "bezier", points = { {0, 0},       {1, 1}       } })
hl.curve("almostLinear",   { type = "bezier", points = { {0.5, 0.5},   {0.75, 1}    } })
hl.curve("quick",          { type = "bezier", points = { {0.15, 0},    {0.1, 1}     } })

-- Animations
hl.animation({ leaf = "global",           enabled = true,  speed = 10,   bezier = "default" })
hl.animation({ leaf = "border",           enabled = true,  speed = 5.39, bezier = "easeOutQuint" })
hl.animation({ leaf = "windows",          enabled = true,  speed = 3.79, bezier = "easeOutQuint" })
hl.animation({ leaf = "windowsIn",        enabled = true,  speed = 4.1,  bezier = "easeOutQuint", style = "popin 87%" })
hl.animation({ leaf = "windowsOut",       enabled = true,  speed = 1.49, bezier = "linear",       style = "popin 87%" })
hl.animation({ leaf = "fadeIn",           enabled = true,  speed = 1.73, bezier = "almostLinear" })
hl.animation({ leaf = "fadeOut",          enabled = true,  speed = 1.46, bezier = "almostLinear" })
hl.animation({ leaf = "fade",            enabled = true,  speed = 3.03, bezier = "quick" })
hl.animation({ leaf = "layers",           enabled = true,  speed = 3.81, bezier = "easeOutQuint" })
hl.animation({ leaf = "layersIn",         enabled = true,  speed = 4,    bezier = "easeOutQuint", style = "fade" })
hl.animation({ leaf = "layersOut",        enabled = true,  speed = 1.5,  bezier = "linear",       style = "fade" })
hl.animation({ leaf = "fadeLayersIn",     enabled = true,  speed = 1.79, bezier = "almostLinear" })
hl.animation({ leaf = "fadeLayersOut",    enabled = true,  speed = 1.39, bezier = "almostLinear" })
hl.animation({ leaf = "workspaces",       enabled = false })
hl.animation({ leaf = "specialWorkspace", enabled = true,  speed = 3,    bezier = "easeOutQuint", style = "slidevert" })

hl.config({
    dwindle = {
        preserve_split = true,
    },

    misc = {
        force_default_wallpaper  = 0,
        disable_hyprland_logo    = true,
        disable_splash_rendering = true,
        vrr                      = 0,
    },
})


---------------
---- INPUT ----
---------------

hl.config({
    input = {
        kb_layout  = "br,us",
        kb_variant = "thinkpad,intl",
        kb_model   = "thinkpad60,",
        kb_options = "grp:win_space_toggle",
        kb_rules   = "",

        follow_mouse = 1,
        sensitivity  = 0,

        touchpad = {
            natural_scroll = true,
        },
    },
})

hl.gesture({ fingers = 3, direction = "horizontal", action = "workspace" })

hl.device({ name = "epic-mouse-v1", sensitivity = -0.5 })


-----------------------
---- KEYBINDINGS ------
-----------------------

local mainMod = "SUPER"

-- hyprswitch (alt + tab)
hl.bind("ALT + tab", hl.dsp.exec_cmd("hyprswitch gui --mod-key alt --key tab --close mod-key-release --reverse-key=key=grave && hyprswitch dispatch"))
hl.bind("ALT + GRAVE + tab", hl.dsp.exec_cmd("hyprswitch gui --mod-key alt --key tab --close mod-key-release --reverse-key=key=grave && hyprswitch dispatch -r"))

-- App launchers
hl.bind(mainMod .. " + RETURN", hl.dsp.exec_cmd(terminal))
hl.bind(mainMod .. " + B", hl.dsp.exec_cmd(browser))
hl.bind(mainMod .. " + O", hl.dsp.exec_cmd(notes))
hl.bind(mainMod .. " + C", hl.dsp.exec_cmd(editor))
hl.bind(mainMod .. " + N", hl.dsp.exec_cmd(terminal .. " -e nvim"))
hl.bind(mainMod .. " + SHIFT + Q", hl.dsp.exec_cmd(home .. "/.config/hypr/scripts/kill-confirm.sh"))
hl.bind(mainMod .. " + M", hl.dsp.exec_cmd(webapp .. "=https://music.youtube.com"))
hl.bind(mainMod .. " + SHIFT + RETURN", hl.dsp.exec_cmd(fileManager))
hl.bind(mainMod .. " + W", hl.dsp.window.float({ action = "toggle" }))
hl.bind(mainMod .. " + A", hl.dsp.exec_cmd("walker"))
hl.bind("CTRL + ALT + X", hl.dsp.exit())

-- Web apps
hl.bind(mainMod .. " + SHIFT + A", hl.dsp.exec_cmd(webapp .. "=https://chatgpt.com"))
hl.bind(mainMod .. " + SHIFT + P", hl.dsp.exec_cmd(passwordManager))
hl.bind(mainMod .. " + SHIFT + C", hl.dsp.exec_cmd(webapp .. "=https://claude.ai"))
hl.bind(mainMod .. " + SHIFT + H", hl.dsp.exec_cmd(webapp .. "=https://gemini.google.com"))
hl.bind(mainMod .. " + Y", hl.dsp.exec_cmd(webapp .. "=https://youtube.com"))
hl.bind(mainMod .. " + SHIFT + Y", hl.dsp.exec_cmd(webapp .. "=https://web.whatsapp.com"))
hl.bind(mainMod .. " + SHIFT + N", hl.dsp.exec_cmd(webapp .. "=https://keep.google.com/"))
hl.bind(mainMod .. " + SHIFT + D", hl.dsp.exec_cmd(webapp .. "=https://discord.com/channels/@me"))
hl.bind(mainMod .. " + SHIFT + W", hl.dsp.exec_cmd(webapp .. "=https://teams.microsoft.com/v2/"))
hl.bind(mainMod .. " + SHIFT + O", hl.dsp.exec_cmd(webapp .. "=https://outlook.office.com/"))

-- Window management
hl.bind(mainMod .. " + F", hl.dsp.window.fullscreen())
hl.bind(mainMod .. " + SHIFT + E", hl.dsp.exec_cmd("jome -d | wl-copy"))

-- Vim-style focus
hl.bind(mainMod .. " + h", hl.dsp.focus({ direction = "left" }))
hl.bind(mainMod .. " + l", hl.dsp.focus({ direction = "right" }))
hl.bind(mainMod .. " + k", hl.dsp.focus({ direction = "up" }))
hl.bind(mainMod .. " + j", hl.dsp.focus({ direction = "down" }))

-- Workspace cycling
hl.config({ binds = { allow_workspace_cycles = true } })
hl.bind(mainMod .. " + Tab", hl.dsp.focus({ workspace = "previous" }))

-- Switch workspaces with mainMod + [0-9]
for i = 1, 10 do
    local key = i % 10
    hl.bind(mainMod .. " + " .. key, hl.dsp.focus({ workspace = i }))
    hl.bind(mainMod .. " + SHIFT + " .. key, hl.dsp.window.move({ workspace = i }))
end

-- Scroll through existing workspaces
hl.bind(mainMod .. " + mouse_down", hl.dsp.focus({ workspace = "e+1" }))
hl.bind(mainMod .. " + mouse_up", hl.dsp.focus({ workspace = "e-1" }))

-- Move/resize windows with mouse
hl.bind(mainMod .. " + mouse:272", hl.dsp.window.drag(), { mouse = true })
hl.bind(mainMod .. " + mouse:273", hl.dsp.window.resize(), { mouse = true })

-- Move/resize with keyboard (bindm equivalent)
hl.bind(mainMod .. " + Z", hl.dsp.window.drag(), { mouse = true })
hl.bind(mainMod .. " + X", hl.dsp.window.resize(), { mouse = true })

-- Resize active window
hl.bind(mainMod .. " + SHIFT + Right", hl.dsp.exec_cmd("hyprctl dispatch resizeactive 30 0"), { repeating = true })
hl.bind(mainMod .. " + SHIFT + Left", hl.dsp.exec_cmd("hyprctl dispatch resizeactive -30 0"), { repeating = true })
hl.bind(mainMod .. " + SHIFT + Up", hl.dsp.exec_cmd("hyprctl dispatch resizeactive 0 -30"), { repeating = true })
hl.bind(mainMod .. " + SHIFT + Down", hl.dsp.exec_cmd("hyprctl dispatch resizeactive 0 30"), { repeating = true })

-- Clipboard
hl.bind(mainMod .. " + V", hl.dsp.exec_cmd("cliphist list | tofi -c " .. home .. "/.config/tofi/current-configV | cliphist decode | wl-copy"))

-- Screen locking
hl.bind(mainMod .. " + SHIFT + L", hl.dsp.exec_cmd("hyprlock"))

-- Power menu
hl.bind(mainMod .. " + ESCAPE", hl.dsp.exec_cmd(home .. "/.config/hypr/scripts/power-menu.sh"))

-- Waybar toggle
hl.bind("CTRL + Escape", hl.dsp.exec_cmd("pkill waybar && waybar &"))

-- Theme cycle (wellpunk-dark → wellpunk-light → tokyonight → ...)
hl.bind(mainMod .. " + SHIFT + T", hl.dsp.exec_cmd(home .. "/.config/hypr/scripts/theme-switch.sh next"))

-- Wallpaper
hl.bind(mainMod .. " + CTRL + W", hl.dsp.exec_cmd("wpaperctl next-wallpaper"))
hl.bind(mainMod .. " + SHIFT + CTRL + W", hl.dsp.exec_cmd("waypaper"))

-- Screenshot
hl.bind("Print", hl.dsp.exec_cmd("grimblast --notify copysave screen"))
hl.bind(mainMod .. " + Print", hl.dsp.exec_cmd("grimblast --notify copysave active"))
hl.bind(mainMod .. " + ALT + S", hl.dsp.exec_cmd("grimblast --notify copysave area"))
hl.bind(mainMod .. " + SHIFT + S", hl.dsp.exec_cmd(home .. "/.config/hypr/scripts/screenshot-area.sh"))

-- Volume and Media Control
hl.bind("XF86AudioRaiseVolume", hl.dsp.exec_cmd("pamixer -i 5"))
hl.bind("XF86AudioLowerVolume", hl.dsp.exec_cmd("pamixer -d 5"))
hl.bind("XF86AudioMicMute", hl.dsp.exec_cmd("pamixer --default-source -m"))
hl.bind("XF86AudioMute", hl.dsp.exec_cmd("pamixer -t"))
hl.bind("XF86AudioPlay", hl.dsp.exec_cmd("playerctl play-pause"))
hl.bind("XF86AudioPause", hl.dsp.exec_cmd("playerctl play-pause"))
hl.bind("XF86AudioNext", hl.dsp.exec_cmd("playerctl next"))
hl.bind("XF86AudioPrev", hl.dsp.exec_cmd("playerctl previous"))

-- Screen brightness
hl.bind("XF86MonBrightnessUp", hl.dsp.exec_cmd("brightnessctl s +5%"))
hl.bind("XF86MonBrightnessDown", hl.dsp.exec_cmd("brightnessctl s 5%-"))


--------------------------------
---- WINDOWS AND WORKSPACES ----
--------------------------------

hl.window_rule({
    name  = "float-jome",
    match = { class = "^(jome)$" },
    float = true,
})

hl.window_rule({
    name  = "opacity-ghostty",
    match = { class = "^(com.mitchellh.ghostty)$" },
    opacity = "0.90 0.90",
})

hl.window_rule({
    name  = "opacity-thorium",
    match = { class = "^(Thorium-browser)$" },
    opacity = "0.90 0.90",
})

hl.window_rule({
    name  = "opacity-code",
    match = { class = "^(Code)$" },
    opacity = "0.80 0.80",
})

hl.window_rule({
    name  = "opacity-arduino",
    match = { class = "^(Arduino IDE)$" },
    opacity = "0.80 0.80",
})

hl.window_rule({
    name  = "opacity-warp",
    match = { class = "^(dev.warp.Warp)$" },
    opacity = "0.80 0.80",
})

hl.window_rule({
    name  = "opacity-obsidian",
    match = { class = "^(obsidian)$" },
    opacity = "0.95 0.95",
})

hl.window_rule({
    name  = "opacity-code-url",
    match = { class = "^(code-url-handler)$" },
    opacity = "0.80 0.80",
})

hl.window_rule({
    name  = "opacity-code-insiders",
    match = { class = "^(code-insiders-url-handler)$" },
    opacity = "0.80 0.80",
})

hl.window_rule({
    name  = "opacity-kitty",
    match = { class = "^(kitty)$" },
    opacity = "0.95 0.95",
})

hl.window_rule({
    name  = "opacity-nautilus",
    match = { class = "^(org.gnome.Nautilus)$" },
    opacity = "0.80 0.80",
})

hl.window_rule({
    name  = "float-ark",
    match = { class = "^(org.kde.ark)$" },
    float   = true,
    opacity = "0.80 0.80",
})

hl.window_rule({
    name  = "float-nwg-look",
    match = { class = "^(nwg-look)$" },
    float   = true,
    opacity = "0.80 0.80",
})

hl.window_rule({
    name  = "float-qt5ct",
    match = { class = "^(qt5ct)$" },
    float   = true,
    opacity = "0.80 0.80",
})

hl.window_rule({
    name  = "float-qt6ct",
    match = { class = "^(qt6ct)$" },
    float   = true,
    opacity = "0.80 0.80",
})

hl.window_rule({
    name  = "float-kvantum",
    match = { class = "^(kvantummanager)$" },
    float   = true,
    opacity = "0.80 0.80",
})

hl.window_rule({
    name  = "float-pavucontrol",
    match = { class = "^(pavucontrol)$" },
    float   = true,
    opacity = "0.80 0.70",
})

hl.window_rule({
    name  = "float-blueman",
    match = { class = "^(blueman-manager)$" },
    float   = true,
    opacity = "0.80 0.70",
})

hl.window_rule({
    name  = "float-nm-applet",
    match = { class = "^(nm-applet)$" },
    float   = true,
    opacity = "0.80 0.70",
})

hl.window_rule({
    name  = "opacity-spotify",
    match = { class = "^(Spotify)$" },
    opacity = "0.70 0.70",
})

hl.window_rule({
    name  = "opacity-spotify-title",
    match = { initial_title = "^(Spotify Free)$" },
    opacity = "0.70 0.70",
})

hl.window_rule({
    name  = "float-nm-editor",
    match = { class = "^(nm-connection-editor)$" },
    float   = true,
    opacity = "0.80 0.70",
})

hl.window_rule({
    name  = "float-polkit-kde",
    match = { class = "^(org.kde.polkit-kde-authentication-agent-1)$" },
    float   = true,
    opacity = "0.80 0.70",
})

hl.window_rule({
    name  = "opacity-polkit-gnome",
    match = { class = "^(polkit-gnome-authentication-agent-1)$" },
    opacity = "0.80 0.70",
})

hl.window_rule({
    name  = "opacity-portal-gtk",
    match = { class = "^(org.freedesktop.impl.portal.desktop.gtk)$" },
    opacity = "0.80 0.70",
})

hl.window_rule({
    name  = "opacity-portal-hyprland",
    match = { class = "^(org.freedesktop.impl.portal.desktop.hyprland)$" },
    opacity = "0.80 0.70",
})

hl.window_rule({
    name  = "float-flameshot",
    match = { class = "flameshot" },
    float   = true,
    monitor = 1,
    move    = "0 0",
})

-- Layer rules
hl.layer_rule({
    name  = "tofi-layer",
    match = { namespace = "tofi" },
    ignore_alpha = 0,
})

hl.layer_rule({
    name  = "mako-layer",
    match = { namespace = "mako" },
    ignore_alpha = 0,
    blur = true,
})
