import { useState, useEffect, useMemo, useRef, memo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calculator,
  Globe,
  Coins,
  Clock,
  User as UserIcon,
  ChevronDown,
  ShieldCheck,
  Activity,
  Mail,
  Sparkles,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUp,
  ArrowDown,
  Scale,
  Gem,
  Hammer,
  Receipt,
  Layers,
  Award,
  Info,
} from "lucide-react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import Auth from "@/pages/Auth";
import Admin from "@/pages/Admin";
import SubscriptionGate from "@/pages/SubscriptionGate";
import Payment from "@/pages/Payment";
import { api } from "@/lib/api";
import { useAuthUser, clearStoredUser, type AuthUser } from "@/lib/auth";

interface Prices {
  usdPerGram: number;
  bdtPerGram: number;
  k22: number;
}

interface Point {
  time: string;
  price: number;
}

const GRAM_TO_BHORI = 11.664;
const TROY_OUNCE_TO_GRAM = 31.1035;

function StatCard({
  Icon,
  label,
  primary,
  secondary,
  pulse,
  tone = "neutral",
}: {
  Icon: any;
  label: string;
  primary: string;
  secondary?: string;
  pulse?: boolean;
  tone?: "up" | "down" | "neutral";
}) {
  const accent =
    tone === "up"
      ? "hsl(142 70% 55%)"
      : tone === "down"
      ? "hsl(0 80% 65%)"
      : "hsl(var(--gold))";
  return (
    <motion.div
      animate={pulse ? { scale: [1, 1.015, 1] } : {}}
      className="glass-card fade-up"
      style={{
        position: "relative",
        overflow: "hidden",
        borderTop: tone !== "neutral" ? `2px solid ${accent}` : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <Icon size={18} style={{ color: accent }} />
        <span
          style={{
            fontSize: "0.7rem",
            color: "hsl(var(--text-muted))",
            letterSpacing: "0.12em",
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>
      <div
        className="price-tag"
        style={
          tone === "up"
            ? { color: "hsl(142 70% 60%)", WebkitTextFillColor: "hsl(142 70% 60%)", background: "none" }
            : tone === "down"
            ? { color: "hsl(0 80% 70%)", WebkitTextFillColor: "hsl(0 80% 70%)", background: "none" }
            : undefined
        }
      >
        {primary}
      </div>
      {secondary && (
        <p
          style={{
            marginTop: 8,
            fontSize: "0.78rem",
            color: "hsl(var(--text-muted))",
          }}
        >
          {secondary}
        </p>
      )}
    </motion.div>
  );
}

function ChartChip({
  Icon,
  label,
  value,
  color,
}: {
  Icon: any;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--glass-border)",
        borderRadius: 999,
      }}
    >
      <Icon size={13} color={color} />
      <span style={{ fontSize: "0.68rem", color: "hsl(var(--text-muted))", letterSpacing: "0.08em", fontWeight: 700 }}>
        {label.toUpperCase()}
      </span>
      <span style={{ fontSize: "0.85rem", fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

function BreakdownRow({
  Icon,
  label,
  value,
  muted,
}: {
  Icon: any;
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "6px 0",
        opacity: muted ? 0.45 : 1,
      }}
    >
      <span
        style={{
          fontSize: "0.78rem",
          color: "hsl(var(--text-muted))",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Icon size={11} style={{ color: "hsl(var(--gold))" }} />
        {label}
      </span>
      <span style={{ fontSize: "0.88rem", fontWeight: 700 }}>
        ৳{Math.floor(value).toLocaleString()}
      </span>
    </div>
  );
}

const TradingViewWidget = memo(function TradingViewWidget() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (container.current) {
      container.current.innerHTML = "";
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify({
        "autosize": true,
        "symbol": "TVC:GOLD*USDBDT",
        "interval": "1D",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "allow_symbol_change": true,
        "calendar": false,
        "watchlist": [
          "TVC:GOLD"
        ],
        "support_host": "https://www.tradingview.com"
      });
      container.current.appendChild(script);
    }
  }, []);

  return (
    <div className="tradingview-widget-container" style={{ height: "600px", width: "100%", borderRadius: "12px", overflow: "hidden" }}>
      <div className="tradingview-widget-container__widget" ref={container} style={{ height: "100%", width: "100%" }}></div>
    </div>
  );
});

function Dashboard({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [prices, setPrices] = useState<Prices>({
    usdPerGram: 0,
    bdtPerGram: 0,
    k22: 0,
  });
  const [history, setHistory] = useState<Point[]>([]);
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [liveStats, setLiveStats] = useState<{ high: number; low: number; changePct: number } | null>(null);

  const [calcWeight, setCalcWeight] = useState<number>(1);
  const [calcUnit, setCalcUnit] = useState("bhori");
  const [calcKarat, setCalcKarat] = useState<number>(24);
  const [pieces, setPieces] = useState<number>(1);

  const grams = useMemo(() => {
    let g = Number(calcWeight);
    if (calcUnit === "bhori") g *= GRAM_TO_BHORI;
    if (calcUnit === "ounce") g *= TROY_OUNCE_TO_GRAM;
    return g;
  }, [calcWeight, calcUnit]);

  const calc = useMemo(() => {
    if (!prices.bdtPerGram) {
      return { goldValue: 0, total: 0, usd: 0 };
    }
    const goldValue = grams * prices.bdtPerGram * (calcKarat / 24);
    const total = goldValue;
    const usdRate = prices.usdPerGram && prices.bdtPerGram ? prices.usdPerGram / prices.bdtPerGram : 0;
    const usd = total * usdRate;
    return { goldValue, total, usd };
  }, [grams, prices, calcKarat]);

  const value = calc.total;

  const marketStats = useMemo(() => {
    if (!Array.isArray(history) || !history.length) return null;
    const prices24 = history.map((p) => p.price * GRAM_TO_BHORI);
    const high = Math.max(...prices24);
    const low = Math.min(...prices24);
    const first = prices24[0]!;
    const last = prices24[prices24.length - 1]!;
    const avg = prices24.reduce((a, b) => a + b, 0) / prices24.length;
    const change = last - first;
    const changePct = first ? (change / first) * 100 : 0;
    return { high, low, avg, change, changePct, first, last };
  }, [history]);

  const bhoriHistory = useMemo(() => {
    if (!Array.isArray(history)) return [];
    return history.map(p => ({
      ...p,
      price: p.price * GRAM_TO_BHORI
    }));
  }, [history]);

  const fetchHistory = async () => {
    try {
      const r = await api.get<Point[]>("/prices/daily-history");
      if (Array.isArray(r.data)) setHistory(r.data);
    } catch {
      // no-op
    }
  };

  const fetchPrices = async () => {
    try {
      const [g, c] = await Promise.all([
        axios.get<{ price: number }>("https://api.gold-api.com/price/XAU"),
        axios.get<{ rates: Record<string, number> }>(
          "https://open.er-api.com/v6/latest/USD",
        ),
      ]);
      const usdToBdt = c.data.rates["BDT"];
      if (!usdToBdt) return;
      
      // Calculate BDT per Bhori using the local Bangladesh market formula
      // (Spot USD / 42.5) * 16 * Rate + 5000 = BDT per Bhori
      const spotUSD = g.data.price;
      const bhoriBDT = (spotUSD / 42.5) * 16 * usdToBdt + 5000;
      const spotBDTPerGram = bhoriBDT / GRAM_TO_BHORI;
      
      // Update live stats for the header badges
      const apiData = g.data as any;
      setLiveStats({
        high: ((apiData.high || spotUSD) / 42.5) * 16 * usdToBdt + 5000,
        low: ((apiData.low || spotUSD) / 42.5) * 16 * usdToBdt + 5000,
        changePct: apiData.change_percent || 0
      });
      
      setPrices({
        usdPerGram: spotUSD / TROY_OUNCE_TO_GRAM,
        bdtPerGram: spotBDTPerGram,
        k22: spotBDTPerGram * (22 / 24),
      });
      setPulse(true);
      setTimeout(() => setPulse(false), 1800);
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchPrices();
    
    // Poll current prices every 10s
    const priceInterval = setInterval(fetchPrices, 10000);
    
    // Refresh historical trend every 5 minutes
    const historyInterval = setInterval(fetchHistory, 5 * 60 * 1000);
    
    return () => {
      clearInterval(priceInterval);
      clearInterval(historyInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ minHeight: "100vh" }}>
      <div className="bg-mesh" />

      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.25rem 2rem",
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--glass-border)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              filter: pulse
                ? "drop-shadow(0 0 12px hsla(45,95%,55%,0.8))"
                : "drop-shadow(0 0 8px hsla(45,95%,55%,0.4))",
              transition: "filter 0.5s",
            }}
          >
            <img src="/logo.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.05rem", fontWeight: 800 }}>
              GOLDBAZARPRICE
            </h1>
            <span
              style={{
                fontSize: "0.6rem",
                color: "hsl(var(--gold))",
                letterSpacing: "0.18em",
                fontWeight: 700,
              }}
            >
              <span className="live-dot" style={{ marginRight: 6 }} />
              LIVE • BANGLADESH MARKET
            </span>
          </div>
        </div>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setOpen(!open)}
            style={{
              background: "transparent",
              border: "1px solid var(--glass-border)",
              padding: "0.5rem 0.85rem",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              color: "white",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, hsl(var(--gold-bright)), hsl(var(--gold-deep)))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserIcon size={14} color="#1a1300" />
            </div>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
              {user.email?.split("@")[0]}
            </span>
            <ChevronDown size={14} color="#888" />
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: 200,
                  background: "hsl(var(--bg-elev))",
                  border: "1px solid var(--glass-border)",
                  borderRadius: 12,
                  padding: 6,
                  zIndex: 200,
                  boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
                }}
              >
                <div
                  onClick={onLogout}
                  style={{
                    padding: "10px 12px",
                    color: "#ff7b7b",
                    cursor: "pointer",
                    borderRadius: 8,
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  Logout Account
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="container">


          <div className="glass-card span-full fade-up" style={{ padding: "1.75rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "1.25rem",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <TrendingUp size={20} style={{ color: "hsl(var(--gold))" }} />
                  <h3 style={{ fontWeight: 700 }}>Gold Market Trend (BDT)</h3>
                  <span className="badge badge-gold" style={{ marginLeft: 6 }}>
                    <span className="live-dot" /> LIVE · 🇧🇩
                  </span>
                </div>
                <p className="subtitle" style={{ fontSize: "0.78rem" }}>
                  Live Gold Spot Price in Bangladeshi Taka (BDT)
                </p>
              </div>

              {(liveStats || marketStats) && (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <ChartChip 
                    Icon={ArrowUp} 
                    label="High" 
                    value={`৳${Math.floor(liveStats?.high || marketStats?.high || 0).toLocaleString()}`} 
                    color="hsl(142 70% 55%)" 
                  />
                  <ChartChip 
                    Icon={ArrowDown} 
                    label="Low" 
                    value={`৳${Math.floor(liveStats?.low || marketStats?.low || 0).toLocaleString()}`} 
                    color="hsl(0 80% 65%)" 
                  />
                  <ChartChip
                    Icon={(liveStats?.changePct || marketStats?.change || 0) >= 0 ? ArrowUpRight : ArrowDownRight}
                    label="Change"
                    value={`${(liveStats?.changePct || marketStats?.changePct || 0) >= 0 ? "+" : ""}${(liveStats?.changePct || marketStats?.changePct || 0).toFixed(2)}%`}
                    color={(liveStats?.changePct || marketStats?.changePct || 0) >= 0 ? "hsl(142 70% 55%)" : "hsl(0 80% 65%)"}
                  />
                </div>
              )}
            </div>

            <TradingViewWidget />
          </div>

          <div className="glass-card span-full fade-up">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem", justifyContent: "space-between", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Clock size={18} style={{ color: "hsl(var(--gold))" }} />
                <h3>মার্কেট দর সারসংক্ষেপ · Karat Protocol</h3>
              </div>
              <span style={{ fontSize: "0.7rem", color: "hsl(var(--text-muted))", letterSpacing: "0.1em" }}>
                1 BHORI = 11.664 GRAMS
              </span>
            </div>
            <div className="scroll-area">
              <table>
                <thead>
                  <tr>
                    <th>Karat</th>
                    <th>Purity</th>
                    <th>Per Gram</th>
                    <th>Per Bhori</th>
                    <th>Per 10g</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { k: 24, label: "24K", purity: "99.9%" },
                    { k: 22, label: "22K", purity: "91.6%" },
                    { k: 21, label: "21K", purity: "87.5%" },
                    { k: 18, label: "18K", purity: "75.0%" },
                    { k: 14.6, label: "Traditional", purity: "60.8%" },
                  ].map((row) => {
                    const perGram = prices.bdtPerGram ? prices.bdtPerGram * (row.k / 24) : 0;
                    return (
                      <tr key={row.k}>
                        <td style={{ fontWeight: 700 }}>{row.label}</td>
                        <td style={{ color: "hsl(var(--text-muted))", fontSize: "0.85rem" }}>{row.purity}</td>
                        <td className="gold-text" style={{ fontWeight: 700 }}>
                          ৳ {perGram ? Math.floor(perGram).toLocaleString() : "—"}
                        </td>
                        <td className="gold-text" style={{ fontWeight: 700 }}>
                          ৳ {perGram ? Math.floor(perGram * GRAM_TO_BHORI).toLocaleString() : "—"}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          ৳ {perGram ? Math.floor(perGram * 10).toLocaleString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-card span-full fade-up" style={{ padding: "2.5rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: "1.75rem",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <Calculator size={20} style={{ color: "hsl(var(--gold))" }} />
                  <h3>Precision Jewellers Valuation</h3>
                </div>
                <p className="subtitle" style={{ fontSize: "0.82rem" }}>
                  Live valuation based on current market rates
                </p>
              </div>
              <span className="badge badge-gold">
                <Award size={11} /> JEWELLER GRADE
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(280px, 1.05fr) minmax(280px, 1.4fr)",
                gap: "2rem",
                alignItems: "stretch",
              }}
              className="valuation-grid"
            >
              <div className="auth-form" style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "0.75rem" }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>
                      <Scale size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />
                      Weight
                    </label>
                    <input
                      type="number"
                      value={calcWeight}
                      onChange={(e) => setCalcWeight(Number(e.target.value))}
                      min={0}
                      step="0.01"
                    />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Unit</label>
                    <select value={calcUnit} onChange={(e) => setCalcUnit(e.target.value)}>
                      <option value="gram">Grams</option>
                      <option value="bhori">Bhori</option>
                      <option value="ounce">Troy Ounce</option>
                    </select>
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>
                    <Gem size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />
                    Purity
                  </label>
                  <select value={calcKarat} onChange={(e) => setCalcKarat(Number(e.target.value))}>
                    <option value={24}>24K — Pure (99.9%)</option>
                    <option value={22}>22K — Standard Jewelry (91.6%)</option>
                    <option value={21}>21K — Light Jewelry (87.5%)</option>
                    <option value={18}>18K — Designer (75.0%)</option>
                  </select>
                </div>



                <div
                  style={{
                    padding: "0.75rem 0.9rem",
                    background: "rgba(255,255,255,0.025)",
                    border: "1px dashed var(--gold-border)",
                    borderRadius: 10,
                    fontSize: "0.78rem",
                    color: "hsl(var(--text-muted))",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Info size={13} style={{ color: "hsl(var(--gold))", flexShrink: 0 }} />
                  <span>
                    Working with{" "}
                    <strong className="gold-text">{grams.toFixed(3)}g</strong> of{" "}
                    <strong className="gold-text">{calcKarat}K</strong> gold
                  </span>
                </div>
              </div>

              <div
                className="gold-card"
                style={{
                  padding: "2rem",
                  boxShadow: "var(--gold-glow)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <p
                  style={{
                    color: "hsl(var(--gold))",
                    fontWeight: 800,
                    fontSize: "0.7rem",
                    letterSpacing: "0.18em",
                    textAlign: "center",
                  }}
                >
                  ESTIMATED TOTAL VALUATION
                </p>
                <div
                  style={{
                    fontSize: "clamp(2.2rem, 4.5vw, 3.2rem)",
                    fontWeight: 800,
                    margin: "0.75rem 0 0.4rem",
                    letterSpacing: "-0.02em",
                    textAlign: "center",
                  }}
                  className="gold-text"
                >
                  ৳{Math.floor(calc.total).toLocaleString()}
                </div>
                <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.78rem", textAlign: "center", marginBottom: "1.25rem" }}>
                  ≈ ${calc.usd.toFixed(2)} USD
                </p>

                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    paddingTop: "1rem",
                    borderTop: "1px solid var(--gold-border)",
                  }}
                >
                  <BreakdownRow Icon={Gem} label={`Gold value (${calcKarat}K × ${grams.toFixed(2)}g)`} value={calc.goldValue} />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.75rem 0 0",
                      borderTop: "1px dashed var(--gold-border)",
                      marginTop: 4,
                    }}
                  >
                    <span style={{ fontSize: "0.78rem", color: "hsl(var(--gold))", fontWeight: 700, letterSpacing: "0.1em" }}>
                      TOTAL
                    </span>
                    <span className="gold-text" style={{ fontWeight: 800, fontSize: "1.1rem" }}>
                      ৳{Math.floor(calc.total).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginTop: "1rem",
                  }}
                >
                  {[22, 21, 18].filter((k) => k !== calcKarat).slice(0, 2).map((k) => {
                    const altTotal = grams * (prices.bdtPerGram || 0) * (k / 24);
                    return (
                      <div
                        key={k}
                        style={{
                          padding: "0.6rem 0.75rem",
                          background: "rgba(0,0,0,0.25)",
                          border: "1px solid var(--gold-border)",
                          borderRadius: 8,
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: "0.62rem", color: "hsl(var(--text-muted))", letterSpacing: "0.1em", fontWeight: 700 }}>
                          IF {k}K
                        </div>
                        <div className="gold-text" style={{ fontWeight: 800, fontSize: "0.92rem", marginTop: 2 }}>
                          ৳{Math.floor(altTotal).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
        </div>
      </div>

      <footer
        style={{
          background: "rgba(0,0,0,0.4)",
          padding: "3.5rem 2rem 2rem",
          borderTop: "1px solid var(--glass-border)",
          marginTop: "3rem",
        }}
      >
        <div
          className="container"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "3rem",
            padding: 0,
          }}
        >
          <div>
            <h4
              style={{
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 18,
                  background: "hsl(var(--gold))",
                  borderRadius: 2,
                }}
              />
              GOLDBAZARPRICE GOLD ANALYTIC
            </h4>
            <p style={{ color: "#888", fontSize: "0.85rem", lineHeight: 1.7 }}>
              Real-time precision and analytical tools for the modern jeweler
              and gold investor.
            </p>
            <div style={{ display: "flex", gap: 16, marginTop: "1.5rem" }}>
              <Globe size={16} color="#666" />
              <Activity size={16} color="#666" />
              <ShieldCheck size={16} color="#666" />
              <Mail size={16} color="#666" />
            </div>
          </div>
          <div>
            <h5
              style={{
                marginBottom: "1.25rem",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                fontSize: "0.65rem",
                fontWeight: 800,
                color: "hsl(var(--gold))",
              }}
            >
              Quick Navigation
            </h5>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {["Market Rates", "Valuation Tools", "Live Spectrum", "Subscription Hub"].map(
                (l) => (
                  <li
                    key={l}
                    style={{
                      color: "#888",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    {l}
                  </li>
                ),
              )}
            </ul>
          </div>
          <div style={{ textAlign: "right" }}>
            <h5 style={{ color: "#888", marginBottom: 10, fontSize: "0.7rem", letterSpacing: "0.15em", fontWeight: 700 }}>
              DEVELOPED BY
            </h5>
            <p
              className="gold-text"
              style={{
                fontWeight: 800,
                fontSize: "1.1rem",
                letterSpacing: "0.05em",
              }}
            >
              Arpit
            </p>
            <p style={{ color: "#444", fontSize: "0.65rem", marginTop: 8, letterSpacing: "0.1em" }}>
              © 2026 PRECISION MARKET SYSTEM
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Root() {
  const user = useAuthUser();
  const [active, setActive] = useState(false);
  const [checking, setChecking] = useState(false);

  const syncAndCheck = async (u: AuthUser | null) => {
    if (!u || !u.email) return;
    setChecking(true);
    try {
      await api.post("/auth/sync", { email: u.email });
      const r = await api.get("/subscription", {
        headers: { "x-user-email": u.email },
      });
      setActive(Boolean(r.data.active));
    } catch {
      setActive(false);
    }
    setChecking(false);
  };

  useEffect(() => {
    if (user) syncAndCheck(user);
    else setActive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const handleLogout = () => {
    clearStoredUser();
    setActive(false);
  };

  if (checking) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div className="bg-mesh" />
        <Loader2 className="spin" size={32} style={{ color: "hsl(var(--gold))" }} />
        <h2
          className="gold-text"
          style={{ fontSize: "0.9rem", letterSpacing: "0.2em", fontWeight: 700 }}
        >
          ESTABLISHING 24H SPECTRUM…
        </h2>
      </div>
    );
  }

  if (!user) return <Auth onLogin={() => {}} />;
  if (!active) return <SubscriptionGate user={user} onLogout={handleLogout} />;
  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/" element={<Root />} />
      </Routes>
    </Router>
  );
}
