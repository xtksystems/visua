// Generated from DESIGN.md (Visua Observatory) by @visua/design. Do not edit.
export const designSystem = {
  "name": "Visua Observatory",
  "version": "alpha",
  "colors": {
    "primary": "#7AA2FF",
    "primary-hover": "#9DBBFF",
    "on-primary": "#07101F",
    "primary-container": "#1A2A4F",
    "on-primary-container": "#D4E1FF",
    "secondary": "#A9B6CC",
    "on-secondary": "#0B1220",
    "tertiary": "#B69CFF",
    "tertiary-hover": "#CBB8FF",
    "on-tertiary": "#140A33",
    "tertiary-container": "#251C4A",
    "on-tertiary-container": "#E4DAFF",
    "neutral": "#070A12",
    "surface": "#0C111C",
    "surface-raised": "#121927",
    "surface-overlay": "#192234",
    "surface-bright": "#222D42",
    "surface-glass": "#0C111CD9",
    "on-surface": "#E6ECF7",
    "on-surface-muted": "#9AA8BF",
    "outline": "#2A364C",
    "outline-strong": "#3D4C68",
    "scene-grid": "#141C2B",
    "status-not-started": "#8D9BB3",
    "status-not-started-container": "#1A2130",
    "status-in-progress": "#F2B544",
    "status-in-progress-container": "#33270D",
    "status-implemented": "#3CCB8C",
    "status-implemented-container": "#0F2E22",
    "status-verified": "#45D0FF",
    "status-verified-container": "#0B2838",
    "status-at-risk": "#FF6B6B",
    "status-at-risk-container": "#3A1418",
    "status-not-applicable": "#475269",
    "status-not-applicable-container": "#151A24",
    "on-status": "#06090F",
    "error": "#FF6B6B",
    "on-error": "#2B0707",
    "framework-csf": "#7AA2FF",
    "framework-csf-container": "#16244A",
    "framework-soc2": "#F28FD0",
    "framework-soc2-container": "#3A1531",
    "framework-rmf": "#C5E86C",
    "framework-rmf-container": "#27310F"
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
      "backgroundColor": "#070A12",
      "textColor": "#E6ECF7",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "14px",
        "fontWeight": 400,
        "lineHeight": 1.55
      }
    },
    "scene-space": {
      "backgroundColor": "#070A12",
      "textColor": "#9AA8BF"
    },
    "scene-grid": {
      "backgroundColor": "#141C2B"
    },
    "nav-rail": {
      "backgroundColor": "#0C111C",
      "textColor": "#9AA8BF",
      "width": "64px"
    },
    "nav-rail-item-active": {
      "backgroundColor": "#1A2A4F",
      "textColor": "#D4E1FF",
      "rounded": "8px",
      "size": "40px"
    },
    "top-bar": {
      "backgroundColor": "#0C111C",
      "textColor": "#E6ECF7",
      "height": "52px"
    },
    "panel": {
      "backgroundColor": "#0C111C",
      "textColor": "#E6ECF7",
      "rounded": "12px",
      "padding": "16px"
    },
    "panel-raised": {
      "backgroundColor": "#121927",
      "textColor": "#E6ECF7",
      "rounded": "12px",
      "padding": "16px"
    },
    "hud-glass": {
      "backgroundColor": "#0C111CD9",
      "textColor": "#E6ECF7",
      "rounded": "12px",
      "padding": "12px"
    },
    "inspector": {
      "backgroundColor": "#0C111C",
      "textColor": "#E6ECF7",
      "width": "440px",
      "padding": "20px"
    },
    "divider": {
      "backgroundColor": "#2A364C"
    },
    "divider-strong": {
      "backgroundColor": "#3D4C68"
    },
    "button-primary": {
      "backgroundColor": "#7AA2FF",
      "textColor": "#07101F",
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
      "backgroundColor": "#9DBBFF",
      "textColor": "#07101F"
    },
    "button-secondary": {
      "backgroundColor": "#192234",
      "textColor": "#E6ECF7",
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
      "backgroundColor": "#222D42",
      "textColor": "#E6ECF7"
    },
    "button-quiet": {
      "backgroundColor": "#0C111C",
      "textColor": "#A9B6CC",
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
      "backgroundColor": "#B69CFF",
      "textColor": "#140A33",
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
      "backgroundColor": "#CBB8FF",
      "textColor": "#140A33"
    },
    "button-danger": {
      "backgroundColor": "#FF6B6B",
      "textColor": "#2B0707",
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
      "backgroundColor": "#121927",
      "textColor": "#E6ECF7",
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
      "backgroundColor": "#121927",
      "textColor": "#9AA8BF",
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
      "backgroundColor": "#1A2A4F",
      "textColor": "#D4E1FF",
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
      "backgroundColor": "#1A2130",
      "textColor": "#8D9BB3",
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
      "backgroundColor": "#33270D",
      "textColor": "#F2B544",
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
      "backgroundColor": "#0F2E22",
      "textColor": "#3CCB8C",
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
      "backgroundColor": "#0B2838",
      "textColor": "#45D0FF",
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
      "backgroundColor": "#3A1418",
      "textColor": "#FF6B6B",
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
      "backgroundColor": "#151A24",
      "textColor": "#9AA8BF",
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
      "backgroundColor": "#251C4A",
      "textColor": "#E4DAFF",
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
      "backgroundColor": "#16244A",
      "textColor": "#7AA2FF",
      "typography": {
        "fontFamily": "IBM Plex Mono",
        "fontSize": "11px",
        "fontWeight": 500,
        "lineHeight": 1.3
      },
      "rounded": "4px"
    },
    "badge-framework-soc2": {
      "backgroundColor": "#3A1531",
      "textColor": "#F28FD0",
      "typography": {
        "fontFamily": "IBM Plex Mono",
        "fontSize": "11px",
        "fontWeight": 500,
        "lineHeight": 1.3
      },
      "rounded": "4px"
    },
    "badge-framework-rmf": {
      "backgroundColor": "#27310F",
      "textColor": "#C5E86C",
      "typography": {
        "fontFamily": "IBM Plex Mono",
        "fontSize": "11px",
        "fontWeight": 500,
        "lineHeight": 1.3
      },
      "rounded": "4px"
    },
    "requirement-code": {
      "backgroundColor": "#121927",
      "textColor": "#7AA2FF",
      "typography": {
        "fontFamily": "IBM Plex Mono",
        "fontSize": "13px",
        "fontWeight": 500,
        "lineHeight": 1.4
      },
      "rounded": "2px"
    },
    "tooltip": {
      "backgroundColor": "#192234",
      "textColor": "#E6ECF7",
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
      "backgroundColor": "#192234",
      "textColor": "#E6ECF7",
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
      "backgroundColor": "#121927",
      "textColor": "#E6ECF7",
      "rounded": "16px",
      "padding": "24px",
      "width": "560px"
    },
    "table-header": {
      "backgroundColor": "#121927",
      "textColor": "#9AA8BF",
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
      "backgroundColor": "#0C111C",
      "textColor": "#E6ECF7",
      "typography": {
        "fontFamily": "IBM Plex Sans",
        "fontSize": "14px",
        "fontWeight": 400,
        "lineHeight": 1.55
      },
      "height": "40px"
    },
    "table-row-hover": {
      "backgroundColor": "#121927",
      "textColor": "#E6ECF7"
    },
    "metric-tile": {
      "backgroundColor": "#0C111C",
      "textColor": "#E6ECF7",
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
      "backgroundColor": "#2A364C",
      "height": "6px",
      "rounded": "9999px"
    },
    "progress-fill": {
      "backgroundColor": "#7AA2FF",
      "height": "6px",
      "rounded": "9999px"
    },
    "agent-step": {
      "backgroundColor": "#251C4A",
      "textColor": "#E4DAFF",
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
      "backgroundColor": "#121927",
      "textColor": "#9AA8BF",
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
      "backgroundColor": "#121927",
      "textColor": "#A9B6CC",
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
      "backgroundColor": "#192234",
      "textColor": "#E6ECF7",
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
      "backgroundColor": "#3A1418",
      "textColor": "#FF6B6B",
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
      "backgroundColor": "#0C111CD9",
      "textColor": "#E6ECF7",
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
      "backgroundColor": "#070A12",
      "textColor": "#9AA8BF",
      "typography": {
        "fontFamily": "Space Grotesk",
        "fontSize": "11px",
        "fontWeight": 600,
        "lineHeight": 1,
        "letterSpacing": "0.12em"
      }
    },
    "scene-node-not-started": {
      "backgroundColor": "#8D9BB3",
      "textColor": "#06090F"
    },
    "scene-node-in-progress": {
      "backgroundColor": "#F2B544",
      "textColor": "#06090F"
    },
    "scene-node-implemented": {
      "backgroundColor": "#3CCB8C",
      "textColor": "#06090F"
    },
    "scene-node-verified": {
      "backgroundColor": "#45D0FF",
      "textColor": "#06090F"
    },
    "scene-node-at-risk": {
      "backgroundColor": "#FF6B6B",
      "textColor": "#06090F"
    },
    "scene-node-not-applicable": {
      "backgroundColor": "#475269",
      "textColor": "#E6ECF7"
    },
    "scene-node-selected": {
      "backgroundColor": "#7AA2FF",
      "textColor": "#07101F"
    },
    "scene-agent-signal": {
      "backgroundColor": "#B69CFF",
      "textColor": "#140A33"
    },
    "secondary-action": {
      "backgroundColor": "#A9B6CC",
      "textColor": "#0B1220",
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
