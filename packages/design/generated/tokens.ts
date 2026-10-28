// Generated from DESIGN.md (Visua) by @visua/design. Do not edit.
export const designSystem = {
  "name": "Visua",
  "version": "alpha",
  "colors": {
    "primary": "#366B53",
    "primary-hover": "#285740",
    "on-primary": "#FFFFFF",
    "primary-container": "#E3F0E7",
    "on-primary-container": "#285740",
    "secondary": "#52665A",
    "on-secondary": "#FFFFFF",
    "tertiary": "#A3553F",
    "tertiary-hover": "#8A432F",
    "on-tertiary": "#FFFFFF",
    "tertiary-container": "#F8EBE5",
    "on-tertiary-container": "#81422F",
    "neutral": "#F7F8F4",
    "surface": "#FFFFFF",
    "surface-raised": "#F2F5F0",
    "surface-overlay": "#FFFFFF",
    "surface-bright": "#E8EEE7",
    "surface-glass": "#FFFFFFE8",
    "on-surface": "#1D3028",
    "on-surface-muted": "#5B6C61",
    "outline": "#D9E1D8",
    "outline-strong": "#BFCFC2",
    "scene-grid": "#DFE7DE",
    "status-not-started": "#607168",
    "status-not-started-container": "#EEF2EE",
    "status-in-progress": "#8A6222",
    "status-in-progress-container": "#FBF1DE",
    "status-implemented": "#2F7350",
    "status-implemented-container": "#E7F3E9",
    "status-verified": "#286C80",
    "status-verified-container": "#E4F2F5",
    "status-at-risk": "#B3473E",
    "status-at-risk-container": "#FBEAE7",
    "status-not-applicable": "#626B65",
    "status-not-applicable-container": "#F0F1EF",
    "on-status": "#FFFFFF",
    "error": "#B3473E",
    "on-error": "#FFFFFF",
    "framework-csf": "#3E6386",
    "framework-csf-container": "#E9F1F8",
    "framework-soc2": "#805576",
    "framework-soc2-container": "#F5EBF2",
    "framework-rmf": "#57703B",
    "framework-rmf-container": "#EFF3E6",
    "framework-ai": "#97552A",
    "framework-ai-container": "#F8EEE6",
    "framework-law": "#705994",
    "framework-law-container": "#F0ECF7"
  },
  "typography": {
    "display-lg": {
      "fontFamily": "Space Grotesk",
      "fontSize": "40px",
      "fontWeight": 600,
      "lineHeight": 1.1,
      "letterSpacing": "-0.02em"
    },
    "headline-lg": {
      "fontFamily": "Space Grotesk",
      "fontSize": "28px",
      "fontWeight": 600,
      "lineHeight": 1.2,
      "letterSpacing": "-0.01em"
    },
    "headline-md": {
      "fontFamily": "Space Grotesk",
      "fontSize": "20px",
      "fontWeight": 600,
      "lineHeight": 1.3
    },
    "title-md": {
      "fontFamily": "IBM Plex Sans",
      "fontSize": "15px",
      "fontWeight": 600,
      "lineHeight": 1.4
    },
    "body-lg": {
      "fontFamily": "IBM Plex Sans",
      "fontSize": "16px",
      "fontWeight": 400,
      "lineHeight": 1.6
    },
    "body-md": {
      "fontFamily": "IBM Plex Sans",
      "fontSize": "14px",
      "fontWeight": 400,
      "lineHeight": 1.55
    },
    "body-sm": {
      "fontFamily": "IBM Plex Sans",
      "fontSize": "13px",
      "fontWeight": 400,
      "lineHeight": 1.5
    },
    "label-lg": {
      "fontFamily": "IBM Plex Sans",
      "fontSize": "13px",
      "fontWeight": 500,
      "lineHeight": 1.2,
      "letterSpacing": "0.01em"
    },
    "label-md": {
      "fontFamily": "IBM Plex Sans",
      "fontSize": "12px",
      "fontWeight": 500,
      "lineHeight": 1.2,
      "letterSpacing": "0.02em"
    },
    "label-caps": {
      "fontFamily": "Space Grotesk",
      "fontSize": "11px",
      "fontWeight": 600,
      "lineHeight": 1,
      "letterSpacing": "0.12em"
    },
    "code-md": {
      "fontFamily": "IBM Plex Mono",
      "fontSize": "13px",
      "fontWeight": 500,
      "lineHeight": 1.4
    },
    "code-sm": {
      "fontFamily": "IBM Plex Mono",
      "fontSize": "11px",
      "fontWeight": 500,
      "lineHeight": 1.3
    },
    "metric-xl": {
      "fontFamily": "Space Grotesk",
      "fontSize": "44px",
      "fontWeight": 500,
      "lineHeight": 1,
      "letterSpacing": "-0.03em"
    }
  },
  "rounded": {
    "none": "0px",
    "xs": "2px",
    "sm": "4px",
    "md": "8px",
    "lg": "12px",
    "xl": "16px",
    "full": "9999px"
  },
  "spacing": {
    "base": "4px",
    "xs": "4px",
    "sm": "8px",
    "md": "12px",
    "lg": "16px",
    "xl": "24px",
    "2xl": "32px",
    "3xl": "48px",
    "4xl": "64px",
    "gutter": "16px"
  },
  "components": {
    "app-shell": {
      "backgroundColor": "#F7F8F4",
      "textColor": "#1D3028",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "14px",
        "fontWeight": 400,
        "lineHeight": 1.55
      }
    },
    "scene-space": {
      "backgroundColor": "#F7F8F4",
      "textColor": "#5B6C61"
    },
    "scene-grid": {
      "backgroundColor": "#DFE7DE"
    },
    "nav-rail": {
      "backgroundColor": "#FFFFFF",
      "textColor": "#5B6C61",
      "width": "220px"
    },
    "nav-rail-item-active": {
      "backgroundColor": "#E3F0E7",
      "textColor": "#285740",
      "rounded": "8px",
      "size": "40px"
    },
    "top-bar": {
      "backgroundColor": "#FFFFFF",
      "textColor": "#1D3028",
      "height": "52px"
    },
    "panel": {
      "backgroundColor": "#FFFFFF",
      "textColor": "#1D3028",
      "rounded": "12px",
      "padding": "16px"
    },
    "panel-raised": {
      "backgroundColor": "#F2F5F0",
      "textColor": "#1D3028",
      "rounded": "12px",
      "padding": "16px"
    },
    "hud-glass": {
      "backgroundColor": "#FFFFFFE8",
      "textColor": "#1D3028",
      "rounded": "12px",
      "padding": "12px"
    },
    "inspector": {
      "backgroundColor": "#FFFFFF",
      "textColor": "#1D3028",
      "width": "440px",
      "padding": "20px"
    },
    "divider": {
      "backgroundColor": "#D9E1D8"
    },
    "divider-strong": {
      "backgroundColor": "#BFCFC2"
    },
    "button-primary": {
      "backgroundColor": "#366B53",
      "textColor": "#FFFFFF",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "13px",
        "fontWeight": 500,
        "lineHeight": 1.2,
        "letterSpacing": "0.01em"
      },
      "rounded": "8px",
      "height": "36px",
      "padding": "14px"
    },
    "button-primary-hover": {
      "backgroundColor": "#285740",
      "textColor": "#FFFFFF"
    },
    "button-secondary": {
      "backgroundColor": "#FFFFFF",
      "textColor": "#1D3028",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "13px",
        "fontWeight": 500,
        "lineHeight": 1.2,
        "letterSpacing": "0.01em"
      },
      "rounded": "8px",
      "height": "36px",
      "padding": "14px"
    },
    "button-secondary-hover": {
      "backgroundColor": "#E8EEE7",
      "textColor": "#1D3028"
    },
    "button-quiet": {
      "backgroundColor": "#FFFFFF",
      "textColor": "#52665A",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "13px",
        "fontWeight": 500,
        "lineHeight": 1.2,
        "letterSpacing": "0.01em"
      },
      "rounded": "8px",
      "height": "32px"
    },
    "button-agent": {
      "backgroundColor": "#A3553F",
      "textColor": "#FFFFFF",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "13px",
        "fontWeight": 500,
        "lineHeight": 1.2,
        "letterSpacing": "0.01em"
      },
      "rounded": "8px",
      "height": "36px",
      "padding": "14px"
    },
    "button-agent-hover": {
      "backgroundColor": "#8A432F",
      "textColor": "#FFFFFF"
    },
    "button-danger": {
      "backgroundColor": "#B3473E",
      "textColor": "#FFFFFF",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "13px",
        "fontWeight": 500,
        "lineHeight": 1.2,
        "letterSpacing": "0.01em"
      },
      "rounded": "8px",
      "height": "36px"
    },
    "input": {
      "backgroundColor": "#F2F5F0",
      "textColor": "#1D3028",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "14px",
        "fontWeight": 400,
        "lineHeight": 1.55
      },
      "rounded": "8px",
      "height": "36px",
      "padding": "10px"
    },
    "chip-filter": {
      "backgroundColor": "#F2F5F0",
      "textColor": "#5B6C61",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "12px",
        "fontWeight": 500,
        "lineHeight": 1.2,
        "letterSpacing": "0.02em"
      },
      "rounded": "9999px",
      "height": "26px"
    },
    "chip-filter-selected": {
      "backgroundColor": "#E3F0E7",
      "textColor": "#285740",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "12px",
        "fontWeight": 500,
        "lineHeight": 1.2,
        "letterSpacing": "0.02em"
      },
      "rounded": "9999px",
      "height": "26px"
    },
    "chip-status-not-started": {
      "backgroundColor": "#EEF2EE",
      "textColor": "#607168",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "12px",
        "fontWeight": 500,
        "lineHeight": 1.2,
        "letterSpacing": "0.02em"
      },
      "rounded": "9999px",
      "height": "22px"
    },
    "chip-status-in-progress": {
      "backgroundColor": "#FBF1DE",
      "textColor": "#8A6222",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "12px",
        "fontWeight": 500,
        "lineHeight": 1.2,
        "letterSpacing": "0.02em"
      },
      "rounded": "9999px",
      "height": "22px"
    },
    "chip-status-implemented": {
      "backgroundColor": "#E7F3E9",
      "textColor": "#2F7350",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "12px",
        "fontWeight": 500,
        "lineHeight": 1.2,
        "letterSpacing": "0.02em"
      },
      "rounded": "9999px",
      "height": "22px"
    },
    "chip-status-verified": {
      "backgroundColor": "#E4F2F5",
      "textColor": "#286C80",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "12px",
        "fontWeight": 500,
        "lineHeight": 1.2,
        "letterSpacing": "0.02em"
      },
      "rounded": "9999px",
      "height": "22px"
    },
    "chip-status-at-risk": {
      "backgroundColor": "#FBEAE7",
      "textColor": "#B3473E",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "12px",
        "fontWeight": 500,
        "lineHeight": 1.2,
        "letterSpacing": "0.02em"
      },
      "rounded": "9999px",
      "height": "22px"
    },
    "chip-status-not-applicable": {
      "backgroundColor": "#F0F1EF",
      "textColor": "#5B6C61",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "12px",
        "fontWeight": 500,
        "lineHeight": 1.2,
        "letterSpacing": "0.02em"
      },
      "rounded": "9999px",
      "height": "22px"
    },
    "badge-agent": {
      "backgroundColor": "#F8EBE5",
      "textColor": "#81422F",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "12px",
        "fontWeight": 500,
        "lineHeight": 1.2,
        "letterSpacing": "0.02em"
      },
      "rounded": "4px"
    },
    "badge-framework-csf": {
      "backgroundColor": "#E9F1F8",
      "textColor": "#3E6386",
      "typography": {
        "fontFamily": "IBM Plex Mono",
        "fontSize": "11px",
        "fontWeight": 500,
        "lineHeight": 1.3
      },
      "rounded": "4px"
    },
    "badge-framework-soc2": {
      "backgroundColor": "#F5EBF2",
      "textColor": "#805576",
      "typography": {
        "fontFamily": "IBM Plex Mono",
        "fontSize": "11px",
        "fontWeight": 500,
        "lineHeight": 1.3
      },
      "rounded": "4px"
    },
    "badge-framework-rmf": {
      "backgroundColor": "#EFF3E6",
      "textColor": "#57703B",
      "typography": {
        "fontFamily": "IBM Plex Mono",
        "fontSize": "11px",
        "fontWeight": 500,
        "lineHeight": 1.3
      },
      "rounded": "4px"
    },
    "badge-framework-ai": {
      "backgroundColor": "#F8EEE6",
      "textColor": "#97552A",
      "typography": {
        "fontFamily": "IBM Plex Mono",
        "fontSize": "11px",
        "fontWeight": 500,
        "lineHeight": 1.3
      },
      "rounded": "4px"
    },
    "badge-framework-law": {
      "backgroundColor": "#F0ECF7",
      "textColor": "#705994",
      "typography": {
        "fontFamily": "IBM Plex Mono",
        "fontSize": "11px",
        "fontWeight": 500,
        "lineHeight": 1.3
      },
      "rounded": "4px"
    },
    "requirement-code": {
      "backgroundColor": "#F2F5F0",
      "textColor": "#366B53",
      "typography": {
        "fontFamily": "IBM Plex Mono",
        "fontSize": "13px",
        "fontWeight": 500,
        "lineHeight": 1.4
      },
      "rounded": "2px"
    },
    "tooltip": {
      "backgroundColor": "#FFFFFF",
      "textColor": "#1D3028",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "13px",
        "fontWeight": 400,
        "lineHeight": 1.5
      },
      "rounded": "4px",
      "padding": "8px"
    },
    "command-palette": {
      "backgroundColor": "#FFFFFF",
      "textColor": "#1D3028",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "16px",
        "fontWeight": 400,
        "lineHeight": 1.6
      },
      "rounded": "16px",
      "width": "680px"
    },
    "dialog": {
      "backgroundColor": "#F2F5F0",
      "textColor": "#1D3028",
      "rounded": "16px",
      "padding": "24px",
      "width": "560px"
    },
    "table-header": {
      "backgroundColor": "#F2F5F0",
      "textColor": "#5B6C61",
      "typography": {
        "fontFamily": "Space Grotesk",
        "fontSize": "11px",
        "fontWeight": 600,
        "lineHeight": 1,
        "letterSpacing": "0.12em"
      },
      "height": "36px"
    },
    "table-row": {
      "backgroundColor": "#FFFFFF",
      "textColor": "#1D3028",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "14px",
        "fontWeight": 400,
        "lineHeight": 1.55
      },
      "height": "40px"
    },
    "table-row-hover": {
      "backgroundColor": "#F2F5F0",
      "textColor": "#1D3028"
    },
    "metric-tile": {
      "backgroundColor": "#FFFFFF",
      "textColor": "#1D3028",
      "typography": {
        "fontFamily": "Space Grotesk",
        "fontSize": "44px",
        "fontWeight": 500,
        "lineHeight": 1,
        "letterSpacing": "-0.03em"
      },
      "rounded": "12px",
      "padding": "16px"
    },
    "progress-track": {
      "backgroundColor": "#D9E1D8",
      "height": "6px",
      "rounded": "9999px"
    },
    "progress-fill": {
      "backgroundColor": "#366B53",
      "height": "6px",
      "rounded": "9999px"
    },
    "agent-step": {
      "backgroundColor": "#F8EBE5",
      "textColor": "#81422F",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "13px",
        "fontWeight": 400,
        "lineHeight": 1.5
      },
      "rounded": "8px",
      "padding": "10px"
    },
    "agent-step-tool": {
      "backgroundColor": "#F2F5F0",
      "textColor": "#5B6C61",
      "typography": {
        "fontFamily": "IBM Plex Mono",
        "fontSize": "11px",
        "fontWeight": 500,
        "lineHeight": 1.3
      },
      "rounded": "8px",
      "padding": "10px"
    },
    "citation": {
      "backgroundColor": "#F2F5F0",
      "textColor": "#52665A",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "13px",
        "fontWeight": 400,
        "lineHeight": 1.5
      },
      "rounded": "4px",
      "padding": "8px"
    },
    "toast": {
      "backgroundColor": "#FFFFFF",
      "textColor": "#1D3028",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "13px",
        "fontWeight": 400,
        "lineHeight": 1.5
      },
      "rounded": "12px",
      "padding": "12px"
    },
    "toast-error": {
      "backgroundColor": "#FBEAE7",
      "textColor": "#B3473E",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "13px",
        "fontWeight": 400,
        "lineHeight": 1.5
      },
      "rounded": "12px",
      "padding": "12px"
    },
    "scene-label": {
      "backgroundColor": "#FFFFFFE8",
      "textColor": "#1D3028",
      "typography": {
        "fontFamily": "IBM Plex Mono",
        "fontSize": "11px",
        "fontWeight": 500,
        "lineHeight": 1.3
      },
      "rounded": "4px",
      "padding": "4px"
    },
    "scene-sector-label": {
      "backgroundColor": "#F7F8F4",
      "textColor": "#5B6C61",
      "typography": {
        "fontFamily": "Space Grotesk",
        "fontSize": "11px",
        "fontWeight": 600,
        "lineHeight": 1,
        "letterSpacing": "0.12em"
      }
    },
    "scene-node-not-started": {
      "backgroundColor": "#607168",
      "textColor": "#FFFFFF"
    },
    "scene-node-in-progress": {
      "backgroundColor": "#8A6222",
      "textColor": "#FFFFFF"
    },
    "scene-node-implemented": {
      "backgroundColor": "#2F7350",
      "textColor": "#FFFFFF"
    },
    "scene-node-verified": {
      "backgroundColor": "#286C80",
      "textColor": "#FFFFFF"
    },
    "scene-node-at-risk": {
      "backgroundColor": "#B3473E",
      "textColor": "#FFFFFF"
    },
    "scene-node-not-applicable": {
      "backgroundColor": "#626B65",
      "textColor": "#FFFFFF"
    },
    "scene-node-selected": {
      "backgroundColor": "#366B53",
      "textColor": "#FFFFFF"
    },
    "scene-agent-signal": {
      "backgroundColor": "#A3553F",
      "textColor": "#FFFFFF"
    },
    "secondary-action": {
      "backgroundColor": "#52665A",
      "textColor": "#FFFFFF",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "13px",
        "fontWeight": 500,
        "lineHeight": 1.2,
        "letterSpacing": "0.01em"
      },
      "rounded": "8px",
      "height": "32px"
    }
  }
} as const;

export type ColorToken = keyof typeof designSystem.colors;
export type TypographyTokenName = keyof typeof designSystem.typography;
export type ComponentName = keyof typeof designSystem.components;
