declare module "glimpseui" {
  import { EventEmitter } from "node:events";

  export type FollowMode = "snap" | "spring";
  export type CursorAnchor = "top-left" | "top-right" | "right" | "bottom-right" | "bottom-left" | "left";

  export interface GlimpseOpenOptions {
    width?: number;
    height?: number;
    title?: string;
    x?: number;
    y?: number;
    frameless?: boolean;
    floating?: boolean;
    transparent?: boolean;
    clickThrough?: boolean;
    followCursor?: boolean;
    followMode?: FollowMode;
    cursorAnchor?: CursorAnchor;
    cursorOffset?: {
      x?: number;
      y?: number;
    };
    hidden?: boolean;
    autoClose?: boolean;
    timeout?: number;
  }

  export interface GlimpseScreenInfo {
    width: number;
    height: number;
    scaleFactor: number;
    visibleX?: number;
    visibleY?: number;
    visibleWidth?: number;
    visibleHeight?: number;
    x?: number;
    y?: number;
  }

  export interface GlimpseAppearanceInfo {
    darkMode: boolean;
    accentColor: string;
    reduceMotion: boolean;
    increaseContrast: boolean;
  }

  export interface GlimpseCursorInfo {
    x: number;
    y: number;
  }

  export interface GlimpseCursorTip {
    x: number;
    y: number;
  }

  export interface GlimpseInfo {
    screen: GlimpseScreenInfo;
    screens: GlimpseScreenInfo[];
    appearance: GlimpseAppearanceInfo;
    cursor: GlimpseCursorInfo;
    cursorTip: GlimpseCursorTip | null;
  }

  export class GlimpseWindow extends EventEmitter {
    on(event: "ready", listener: (info: GlimpseInfo) => void): this;
    on(event: "message", listener: (data: unknown) => void): this;
    on(event: "info", listener: (info: GlimpseInfo) => void): this;
    on(event: "closed", listener: () => void): this;
    on(event: "error", listener: (error: Error) => void): this;
    once(event: "ready", listener: (info: GlimpseInfo) => void): this;
    once(event: "message", listener: (data: unknown) => void): this;
    once(event: "info", listener: (info: GlimpseInfo) => void): this;
    once(event: "closed", listener: () => void): this;
    once(event: "error", listener: (error: Error) => void): this;
    send(js: string): void;
    setHTML(html: string): void;
    show(options?: { title?: string }): void;
    close(): void;
    loadFile(path: string): void;
    get info(): GlimpseInfo | null;
    getInfo(): void;
    followCursor(enabled: boolean, anchor?: CursorAnchor, mode?: FollowMode): void;
  }

  export function open(html: string, options?: GlimpseOpenOptions): GlimpseWindow;
  export function prompt<T = unknown>(html: string, options?: GlimpseOpenOptions): Promise<T | null>;
}
