import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"
type Font = "default" | "berkeley"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  font: Font
  setFont: (font: Font) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  font: "default",
  setFont: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )
  const [font, setFontRaw] = useState<Font>(() => {
    return (localStorage.getItem("vite-ui-font") as Font) || "default"
  })

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  useEffect(() => {
    const root = window.document.documentElement
    if (font === "berkeley") {
      root.classList.add("font-berkeley")
    } else {
      root.classList.remove("font-berkeley")
    }
    localStorage.setItem("vite-ui-font", font)
  }, [font])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
    font,
    setFont: (font: Font) => setFontRaw(font),
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}