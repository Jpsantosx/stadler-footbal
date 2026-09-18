"use client";
import {
  advanceCareerRound,
  careerMatchSquad,
  careerOpponentSquad,
  ensureManagement,
} from "@/lib/football-career";
import { joystickVector, clearMatchInput } from "@/lib/football-input";
import { updateTitleCelebration, seekTitleCelebration } from "@/lib/football-presentation";
import { createStadiumRenderer } from "@/lib/football-webgl";
import CareerOffice from "./career-office";

import {
  competitionPoolFor,
  createCareer,
  createLeagueRows,
  cupNameFor,
  leagueFor,
  leagueNameFor,
  leagueTeamsFor,
  nextLeagueFixture,
  simulateLeagueRound,
  sortedLeagueRows,
} from "@/lib/football-competition";
import {
  FORMATIONS,
  HALF_SECONDS,
  LEAGUES,
  TACTICS,
  TEAMS,
  attributeProfile,
  createMatch,
  finishMatch,
  executeSetPiece,
  getPlayer,
  lineupOverall,
  passBall,
  releaseShot,
  rosterFor,
  selectedIdForSide,
  setPieceInstruction,
  setPieceName,
  slideTackle,
  stealBall,
  switchToClosestPlayer,
  updateMatch,
  updateParticles,
  type CareerState,
  type CompetitionMode,
  type CupScope,
  type Difficulty,
  type FormationId,
  type GameActions,
  type GameMode,
  type Hud,
  type InputState,
  type LeagueId,
  type LeagueRow,
  type MatchState,
  type MatchStats,
  type Quality,
  type Screen,
  type SetPieceKind,
  type Side,
  type TacticId,
  type Team,
  type TeamRegionFilter,
  type View,
} from "@/lib/football-engine";
import { drawScene } from "@/lib/football-renderer";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Crown,
  Gauge,
  Landmark,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Shield,
  Target,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  WalletCards,
  Zap,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

function formatTime(seconds: number) {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return String(minutes).padStart(2, "0") + ":" + String(rest).padStart(2, "0");
}

function officialCrestUrl(team: Team) {
  return team.crestUrl ?? `/crests/${team.id}.png`;
}
function ClubCrest({ team, className }: { team: Team; className: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={"club-crest " + className}
      role="img"
      aria-label={`Escudo do ${team.name}`}
      title={team.name}
    >
      {failed ? (
        <span className="club-crest__fallback">{team.short}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={officialCrestUrl(team)}
          alt=""
          width={128}
          height={128}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
function TeamBadge({
  team,
  compact = false,
}: {
  team: Team;
  compact?: boolean;
}) {
  return (
    <ClubCrest
      key={team.id}
      team={team}
      className={"team-badge" + (compact ? " team-badge--compact" : "")}
    />
  );
}
function TeamFlag({ team }: { team: Team }) {
  return <ClubCrest key={team.id} team={team} className="team-flag" />;
}

export default function FootballGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const joystickPointer = useRef<number | null>(null);
  const shotPointer = useRef<number | null>(null);
  const [fullscreenHint, setFullscreenHint] = useState("");
  const rootRef = useRef<HTMLElement | null>(null);
  const engineRef = useRef<MatchState | null>(null);
  const screenRef = useRef<Screen>("menu");
  const qualityRef = useRef<Quality>("ultra");
  const audioEnabledRef = useRef(true);
  const inputRef = useRef<InputState>({
    keys: new Set<string>(),
    touchX: 0,
    touchY: 0,
    touchSprint: false,
  });
  const actionsRef = useRef<GameActions>({
    pass: () => undefined,
    shootStart: () => undefined,
    shootRelease: () => undefined,
    steal: () => undefined,
    switchPlayer: () => undefined,
    slide: () => undefined,
    togglePause: () => undefined,
  });
  const audioContextRef = useRef<AudioContext | null>(null);
  const resultRecordedRef = useRef(false);
  const ceremonyPreviewRef = useRef(false);
  const [ceremonyPreview, setCeremonyPreview] = useState(false);
  const [cupResult, setCupResult] = useState<{ winner: Side | null; team: Team; final: boolean; shootout: { home: number; away: number } | null } | null>(null);
  const [screen, setScreen] = useState<Screen>("menu");
  const [homeIndex, setHomeIndex] = useState(0);
  const [awayIndex, setAwayIndex] = useState(1);
  const [gameMode, setGameMode] = useState<GameMode>("solo");
  const [competitionMode, setCompetitionMode] =
    useState<CompetitionMode>("friendly");
  const [cupScope, setCupScope] = useState<CupScope>("continental");
  const [selectedLeagueId, setSelectedLeagueId] =
    useState<LeagueId>("brasileirao");
  const [homeFormation, setHomeFormation] = useState<FormationId>("2-3-2");
  const [awayFormation, setAwayFormation] = useState<FormationId>("3-2-2");
  const [homeTactic, setHomeTactic] = useState<TacticId>("balanced");
  const [awayTactic, setAwayTactic] = useState<TacticId>("counter");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [quality, setQuality] = useState<Quality>("ultra");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [teamPickerSide, setTeamPickerSide] = useState<Side | null>(null);
  const [teamRegionFilter, setTeamRegionFilter] =
    useState<TeamRegionFilter>("all");
  const [paused, setPaused] = useState(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [leagueRows, setLeagueRows] = useState<LeagueRow[]>(() =>
    createLeagueRows("brasileirao"),
  );
  const [cupRound, setCupRound] = useState(0);
  const [cupEliminated, setCupEliminated] = useState(false);
  const [career, setCareer] = useState<CareerState>(() =>
    createCareer(TEAMS[0]),
  );
  const [hud, setHud] = useState<Hud>({
    homeScore: 0,
    awayScore: 0,
    remaining: HALF_SECONDS,
    half: 1,
    playerName: "Pedro",
    playerNumber: 9,
    stamina: 100,
    shotCharge: 0,
    message: "",
    fps: 60,
    setPieceKind: null,
    setPieceReady: false,
    setPieceSide: null,
    homeCards: 0,
    awayCards: 0,
    awayPlayerName: "Mbappé",
    awayPlayerNumber: 10,
    awayStamina: 100,
    awayShotCharge: 0,
    playerOverall: 84,
    awayPlayerOverall: 91,
    gameMode: "solo",
  });
  const [finalStats, setFinalStats] = useState<MatchStats>({
    homeShots: 0,
    awayShots: 0,
    homePasses: 0,
    awayPasses: 0,
    homePossession: 0,
    awayPossession: 0,
    homeFouls: 0,
    awayFouls: 0,
    homeCards: 0,
    awayCards: 0,
    homeOffsides: 0,
    awayOffsides: 0,
  });

  const homeTeam = TEAMS[homeIndex];
  const awayTeam = TEAMS[awayIndex];
  const selectedLeague = leagueFor(selectedLeagueId);
  const careerTeam =
    TEAMS.find((team) => team.id === career.clubId) ?? homeTeam;
  const activeCareerSquad = useMemo(
    () =>
      competitionMode === "career" && career.clubId === homeTeam.id
        ? careerMatchSquad(career, homeFormation)
        : undefined,
    [competitionMode, career, homeTeam.id, homeFormation],
  );
  const homeOverall = useMemo(
    () => lineupOverall(homeTeam, homeFormation, activeCareerSquad),
    [activeCareerSquad, homeFormation, homeTeam],
  );
  const awayOverall = useMemo(
    () => lineupOverall(awayTeam, awayFormation),
    [awayFormation, awayTeam],
  );
  const availableAwayTeams = useMemo(() => {
    if (competitionMode === "league" || competitionMode === "career") {
      const fixture = nextLeagueFixture(leagueRows, homeTeam.id);
      if (!fixture) return [];
      const opponent =
        fixture.homeId === homeTeam.id ? fixture.awayId : fixture.homeId;
      return TEAMS.filter(
        (t) => t.id === opponent && t.leagueId === selectedLeagueId,
      );
    }
    return competitionPoolFor(
      homeTeam,
      competitionMode,
      cupScope,
      selectedLeagueId,
    ).filter((t) => t.id !== homeTeam.id);
  }, [competitionMode, cupScope, homeTeam, selectedLeagueId, leagueRows]);
  useEffect(() => {
    if (
      screen !== "menu" ||
      !availableAwayTeams.length ||
      availableAwayTeams.some((t) => t.id === TEAMS[awayIndex].id)
    )
      return;
    const timer = window.setTimeout(
      () =>
        setAwayIndex(TEAMS.findIndex((t) => t.id === availableAwayTeams[0].id)),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [screen, availableAwayTeams, awayIndex]);
  const teamPickerOptions = useMemo(() => {
    const championshipMode =
      competitionMode === "league" || competitionMode === "career";
    const source =
      teamPickerSide === "away"
        ? availableAwayTeams
        : championshipMode
          ? leagueTeamsFor(selectedLeagueId)
          : TEAMS;
    return source
      .filter((team) => {
        if (teamRegionFilter === "brazil") {
          return team.leagueId === "brasileirao";
        }
        if (teamRegionFilter === "europe") {
          return team.leagueId !== "brasileirao";
        }
        return true;
      })
      .sort((first, second) => {
        const firstRegion = first.city === "Brasileirão" ? 0 : 1;
        const secondRegion = second.city === "Brasileirão" ? 0 : 1;
        return (
          firstRegion - secondRegion ||
          first.city.localeCompare(second.city, "pt-BR") ||
          first.name.localeCompare(second.name, "pt-BR")
        );
      });
  }, [
    availableAwayTeams,
    competitionMode,
    selectedLeagueId,
    teamPickerSide,
    teamRegionFilter,
  ]);
  const featuredPlayer = useMemo(
    () =>
      [...rosterFor(homeTeam, activeCareerSquad)].sort(
        (a, b) => b[2] - a[2],
      )[0],
    [activeCareerSquad, homeTeam],
  );
  const featuredAttributes = useMemo(
    () => attributeProfile(featuredPlayer, featuredPlayer[3] ?? "FW"),
    [featuredPlayer],
  );
  const standings = useMemo(() => sortedLeagueRows(leagueRows), [leagueRows]);
  const careerOverall = useMemo(
    () => lineupOverall(careerTeam, homeFormation, career.squad),
    [career.squad, careerTeam, homeFormation],
  );

  const [careerReady, setCareerReady] = useState(false);
  const [careerSaveFailed, setCareerSaveFailed] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem("stadler-career-v1");
        if (stored) {
          const parsed = JSON.parse(stored) as CareerState;
          const index = TEAMS.findIndex((t) => t.id === parsed.clubId);
          const valid =
            index >= 0 &&
            Array.isArray(parsed.squad) &&
            parsed.squad.length >= 8 &&
            parsed.squad.every(
              (p) =>
                Array.isArray(p) &&
                typeof p[0] === "string" &&
                Number.isFinite(p[2]),
            ) &&
            Number.isFinite(parsed.budget);
          if (valid) {
            const next = ensureManagement({
              ...parsed,
              history: Array.isArray(parsed.history) ? parsed.history : [],
              transactions: Array.isArray(parsed.transactions)
                ? parsed.transactions
                : [],
            });
            setCareer(next);
            setHomeIndex(index);
            setSelectedLeagueId(TEAMS[index].leagueId);
            const savedRows = next.management.standings;
            setLeagueRows(
              Array.isArray(savedRows) &&
                savedRows.every(
                  (r) =>
                    typeof r.teamId === "string" && Number.isFinite(r.played),
                )
                ? savedRows
                : createLeagueRows(TEAMS[index].leagueId),
            );
          }
        }
      } catch {
        /* Invalid old saves fall back to a playable new career. */
      }
      setCareerReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!careerReady) return;
    let failed = false;
    try {
      window.localStorage.setItem("stadler-career-v1", JSON.stringify(career));
    } catch {
      failed = true;
    }
    const timer = window.setTimeout(() => setCareerSaveFailed(failed), 0);
    return () => window.clearTimeout(timer);
  }, [career, careerReady]);

  useEffect(() => {
    if (screen !== "finished" || resultRecordedRef.current) return;
    const state = engineRef.current;
    if (!state) return;
    resultRecordedRef.current = true;
    if (competitionMode === "league" || competitionMode === "career") {
      setLeagueRows((current) =>
        simulateLeagueRound(
          current,
          state.homeTeam.id,
          state.awayTeam.id,
          state.homeScore,
          state.awayScore,
        ),
      );
    }
    if (competitionMode === "cup") {
      const advanced = state.winner === "home";
      if (advanced) setCupRound((current) => Math.min(3, current + 1));
      else setCupEliminated(true);
    }
    if (competitionMode === "career") {
      setCareer((current) => {
        const next = ensureManagement(advanceCareerRound(current, state));
        return {
          ...next,
          management: {
            ...next.management,
            standings: simulateLeagueRound(
              leagueRows,
              state.homeTeam.id,
              state.awayTeam.id,
              state.homeScore,
              state.awayScore,
            ),
          },
        };
      });
    }
  }, [competitionMode, screen, leagueRows]);

  const playTone = useCallback(
    (kind: "kick" | "goal" | "whistle" | "tackle") => {
      if (!audioEnabledRef.current) return;
      try {
        const AudioCtor = window.AudioContext;
        const audio = audioContextRef.current ?? new AudioCtor();
        audioContextRef.current = audio;
        if (audio.state === "suspended") void audio.resume();
        const now = audio.currentTime;
        const notes =
          kind === "goal"
            ? [330, 440, 660, 880]
            : kind === "whistle"
              ? [960, 1180]
              : kind === "tackle"
                ? [110]
                : [150];
        notes.forEach((frequency, index) => {
          const oscillator = audio.createOscillator();
          const gain = audio.createGain();
          oscillator.type =
            kind === "goal"
              ? "triangle"
              : kind === "whistle"
                ? "sine"
                : "square";
          oscillator.frequency.setValueAtTime(frequency, now + index * 0.08);
          gain.gain.setValueAtTime(0.0001, now + index * 0.08);
          gain.gain.exponentialRampToValueAtTime(
            kind === "goal" ? 0.055 : 0.025,
            now + index * 0.08 + 0.012,
          );
          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            now + index * 0.08 + (kind === "goal" ? 0.23 : 0.1),
          );
          oscillator.connect(gain);
          gain.connect(audio.destination);
          oscillator.start(now + index * 0.08);
          oscillator.stop(now + index * 0.08 + 0.28);
        });
      } catch {
        // Audio is an enhancement; gameplay continues if the browser blocks it.
      }
    },
    [],
  );

  const setGameScreen = useCallback((next: Screen) => {
    screenRef.current = next;
    setScreen(next);
  }, []);

  const startMatch = useCallback(() => {
    if (
      competitionMode === "career" &&
      ensureManagement(career).management.status === "sacked"
    ) {
      setMarketOpen(true);
      return;
    }
    const matchHome = TEAMS[homeIndex];
    const validOpponentPool = availableAwayTeams;
    const matchAway =
      validOpponentPool.find((team) => team.id === TEAMS[awayIndex]?.id) ??
      validOpponentPool[0];
    if (!matchAway) return;
    const safeAwayIndex = TEAMS.findIndex((team) => team.id === matchAway.id);
    if (safeAwayIndex !== awayIndex) setAwayIndex(safeAwayIndex);
    const next = createMatch(
      matchHome,
      matchAway,
      difficulty,
      false,
      gameMode,
      homeFormation,
      awayFormation,
      homeTactic,
      awayTactic,
      activeCareerSquad,
      competitionMode === "career"
        ? careerOpponentSquad(career, matchAway)
        : undefined,
    );
    next.cupRound = competitionMode === "cup" ? cupRound : null;
    const selected = getPlayer(next, next.selectedId);
    const selectedAway = getPlayer(next, next.selectedAwayId);
    engineRef.current = next;
    resultRecordedRef.current = false;
    setCupResult(null);
    ceremonyPreviewRef.current = false; setCeremonyPreview(false);
    inputRef.current.keys.clear();
    inputRef.current.touchX = 0;
    inputRef.current.touchY = 0;
    inputRef.current.touchSprint = false;
    setKnob({ x: 0, y: 0 });
    setHud({
      homeScore: 0,
      awayScore: 0,
      remaining: HALF_SECONDS,
      half: 1,
      playerName: selected?.name ?? matchHome.name,
      playerNumber: selected?.number ?? 10,
      stamina: 100,
      shotCharge: 0,
      message: "APITO INICIAL",
      fps: 60,
      setPieceKind: null,
      setPieceReady: false,
      setPieceSide: null,
      homeCards: 0,
      awayCards: 0,
      awayPlayerName: selectedAway?.name ?? matchAway.name,
      awayPlayerNumber: selectedAway?.number ?? 10,
      awayStamina: 100,
      awayShotCharge: 0,
      playerOverall: selected?.overall ?? matchHome.rating,
      awayPlayerOverall: selectedAway?.overall ?? matchAway.rating,
      gameMode,
    });
    setPaused(false);
    setGameScreen("playing");
    playTone("whistle");
  }, [
    availableAwayTeams,
    career,
    activeCareerSquad,
    awayFormation,
    awayIndex,
    awayTactic,
    competitionMode,
    cupRound,
    difficulty,
    gameMode,
    homeFormation,
    homeIndex,
    homeTactic,
    playTone,
    setGameScreen,
  ]);

  const goToMenu = useCallback(() => {
    const demo = createMatch(
      TEAMS[homeIndex],
      TEAMS[awayIndex],
      difficulty,
      true,
      gameMode,
      homeFormation,
      awayFormation,
      homeTactic,
      awayTactic,
      activeCareerSquad,
    );
    engineRef.current = demo;
    inputRef.current.keys.clear();
    inputRef.current.touchX = 0;
    inputRef.current.touchY = 0;
    inputRef.current.touchSprint = false;
    setKnob({ x: 0, y: 0 });
    setPaused(false);
    setSettingsOpen(false);
    setGameScreen("menu");
  }, [
    activeCareerSquad,
    awayFormation,
    awayIndex,
    awayTactic,
    difficulty,
    gameMode,
    homeFormation,
    homeIndex,
    homeTactic,
    setGameScreen,
  ]);

  useEffect(() => {
    qualityRef.current = quality;
  }, [quality]);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!engineRef.current || screenRef.current === "menu")
      engineRef.current = createMatch(
        homeTeam,
        awayTeam,
        difficulty,
        true,
        gameMode,
        homeFormation,
        awayFormation,
        homeTactic,
        awayTactic,
        activeCareerSquad,
      );
    const stadium = createStadiumRenderer(canvas);
    const context = stadium ? null : canvas.getContext("2d", { alpha: false });
    if (!stadium && !context) return;
    canvas.dataset.renderer = stadium ? "webgl" : "canvas";
    let view: View = { width: 1280, height: 720, dpr: 1 };
    let animationFrame = 0;
    let previous = performance.now();
    let accumulator = 0;
    let hudTimer = 0;
    let fpsTimer = 0;
    let frames = 0;
    let measuredFps = 60;
    let previousHomeScore = 0;
    let previousAwayScore = 0;
    let previousHalf: 1 | 2 = 1;
    let previousSetPiece: SetPieceKind | null = null;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const maxDpr =
        qualityRef.current === "performance"
          ? 1
          : qualityRef.current === "balanced"
            ? 1.45
            : 2;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const width = Math.max(320, rect.width);
      const height = Math.max(180, rect.height);
      if (
        canvas.width !== Math.round(width * dpr) ||
        canvas.height !== Math.round(height * dpr)
      ) {
        if (stadium) stadium.resize(width, height, dpr);
        else {
          canvas.width = Math.round(width * dpr);
          canvas.height = Math.round(height * dpr);
        }
      }
      view = { width, height, dpr };
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const updateHud = (state: MatchState) => {
      const selected = getPlayer(state, state.selectedId);
      const selectedAway = getPlayer(state, state.selectedAwayId);
      setHud({
        homeScore: state.homeScore,
        awayScore: state.awayScore,
        remaining: state.remaining,
        half: state.half,
        playerName: selected?.name ?? state.homeTeam.short,
        playerNumber: selected?.number ?? 10,
        stamina: selected?.stamina ?? 100,
        shotCharge: state.shotCharge,
        message: state.message,
        fps: measuredFps,
        setPieceKind: state.setPiece?.kind ?? null,
        setPieceReady: state.setPiece?.ready ?? false,
        setPieceSide: state.setPiece?.side ?? null,
        homeCards: state.stats.homeCards,
        awayCards: state.stats.awayCards,
        awayPlayerName: selectedAway?.name ?? state.awayTeam.short,
        awayPlayerNumber: selectedAway?.number ?? 10,
        awayStamina: selectedAway?.stamina ?? 100,
        awayShotCharge: state.awayShotCharge,
        playerOverall: selected?.overall ?? state.homeTeam.rating,
        awayPlayerOverall: selectedAway?.overall ?? state.awayTeam.rating,
        gameMode: state.gameMode,
      });
    };

    const loop = (now: number) => {
      const state = engineRef.current;
      const frameTime = Math.max(0, (now - previous) / 1000);
      const dt = Math.min(0.1, frameTime);
      previous = now;
      resize();
      if (state) {
        const demo = screenRef.current === "menu";
        if (demo || screenRef.current === "playing") {
          if (state.paused || document.hidden) accumulator = 0;
          else {
            accumulator += dt * (demo ? 0.62 : 1);
            while (accumulator >= 1 / 120) {
              updateMatch(state, inputRef.current, 1 / 120, demo);
              accumulator -= 1 / 120;
            }
          }
        } else if (screenRef.current === "celebrating") {
          if (!document.hidden) updateTitleCelebration(state, frameTime);
          if (state.celebration?.complete) {
            if (ceremonyPreviewRef.current) {
              ceremonyPreviewRef.current = false; setCeremonyPreview(false);
              engineRef.current = createMatch(state.homeTeam, state.awayTeam, state.difficulty, true);
              setGameScreen("menu");
            } else setGameScreen("finished");
          }
        } else {
          updateParticles(state, dt);
        }

        if (
          state.homeScore !== previousHomeScore ||
          state.awayScore !== previousAwayScore
        ) {
          if (screenRef.current === "playing") playTone("goal");
          previousHomeScore = state.homeScore;
          previousAwayScore = state.awayScore;
        }

        if (state.half !== previousHalf) {
          if (screenRef.current === "playing") playTone("whistle");
          previousHalf = state.half;
        }

        const currentSetPiece = state.setPiece?.kind ?? null;
        if (
          currentSetPiece &&
          previousSetPiece === null &&
          screenRef.current === "playing"
        ) {
          playTone("whistle");
        }
        previousSetPiece = currentSetPiece;

        if (state.finished && screenRef.current === "playing") {
          setFinalStats({ ...state.stats });
          setCupResult(state.cupRound === null ? null : {
            winner: state.winner, team: state.winner === "home" ? state.homeTeam : state.awayTeam,
            final: state.cupRound === 2, shootout: state.shootout,
          });
          setGameScreen(state.celebration ? "celebrating" : "finished");
          inputRef.current.keys.clear();
          updateHud(state);
          playTone("whistle");
        }

        if (stadium) stadium.render(state, qualityRef.current);
        else if (context) {
          context.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
          drawScene(context, view, state, qualityRef.current);
        }
        hudTimer += dt;
        fpsTimer += dt;
        frames += 1;
        if (fpsTimer >= 0.75) {
          measuredFps = Math.round(frames / fpsTimer);
          frames = 0;
          fpsTimer = 0;
        }
        if (hudTimer >= 0.09) {
          updateHud(state);
          hudTimer = 0;
        }
      }
      animationFrame = requestAnimationFrame(loop);
    };

    actionsRef.current = {
      pass: (side = "home") => {
        const state = engineRef.current;
        if (!state || state.paused || screenRef.current !== "playing") return;
        if (state.setPiece) {
          if (state.setPiece.side === side && state.setPiece.ready) {
            executeSetPiece(state, "pass");
            playTone("kick");
          }
          return;
        }
        passBall(state, side);
        playTone("kick");
      },
      shootStart: (side = "home") => {
        const state = engineRef.current;
        if (!state || state.paused || screenRef.current !== "playing") return;
        if (state.setPiece) {
          if (
            state.setPiece.side === side &&
            state.setPiece.ready &&
            state.setPiece.kind !== "throwIn" &&
            state.setPiece.kind !== "goalKick" &&
            state.setPiece.kind !== "offside"
          ) {
            if (side === "home") state.chargingShot = true;
            else state.chargingAwayShot = true;
          }
          return;
        }
        const owner = getPlayer(state, state.ball.owner);
        if (
          owner?.id === selectedIdForSide(state, side) &&
          owner.side === side
        ) {
          if (side === "home") state.chargingShot = true;
          else state.chargingAwayShot = true;
        }
      },
      shootRelease: (side = "home") => {
        const state = engineRef.current;
        const charging =
          side === "home" ? state?.chargingShot : state?.chargingAwayShot;
        if (!state || !charging) return;
        if (state.setPiece?.side === side && state.setPiece.ready) {
          executeSetPiece(state, "shot");
        } else {
          releaseShot(state, side);
        }
        playTone("kick");
      },
      steal: (side = "home") => {
        const state = engineRef.current;
        if (!state || state.paused || screenRef.current !== "playing") return;
        if (state.setPiece) return;
        stealBall(state, side);
        playTone("tackle");
      },
      switchPlayer: (side = "home") => {
        const state = engineRef.current;
        if (!state || state.paused || screenRef.current !== "playing") return;
        if (state.setPiece) return;
        switchToClosestPlayer(state, side);
      },
      slide: (side = "home") => {
        const state = engineRef.current;
        if (!state || state.paused || screenRef.current !== "playing") return;
        if (state.setPiece) return;
        slideTackle(state, side);
        playTone("tackle");
      },
      togglePause: () => {
        const state = engineRef.current;
        if (!state || screenRef.current !== "playing") return;
        state.paused = !state.paused;
        clearMatchInput(inputRef.current, state);
        joystickPointer.current = null; shotPointer.current = null;
        setKnob({ x: 0, y: 0 });
        setPaused(state.paused);
      },
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (screenRef.current !== "playing") return;
      const blocked = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Space",
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
      ];
      if (blocked.includes(event.code)) event.preventDefault();
      inputRef.current.keys.add(event.code);
      if (event.repeat) return;
      const localTwoPlayer = engineRef.current?.gameMode === "local2p";
      if (localTwoPlayer) {
        if (event.code === "KeyF") actionsRef.current.pass("home");
        if (event.code === "Space") actionsRef.current.shootStart("home");
        if (event.code === "KeyE") actionsRef.current.steal("home");
        if (event.code === "KeyQ") actionsRef.current.switchPlayer("home");
        if (event.code === "KeyR") actionsRef.current.slide("home");
        if (event.code === "KeyK") actionsRef.current.pass("away");
        if (event.code === "KeyL") actionsRef.current.shootStart("away");
        if (event.code === "KeyJ") actionsRef.current.steal("away");
        if (event.code === "KeyI") actionsRef.current.switchPlayer("away");
        if (event.code === "KeyU") actionsRef.current.slide("away");
      } else {
        if (event.code === "KeyF" || event.code === "KeyX") {
          actionsRef.current.pass("home");
        }
        if (event.code === "Space" || event.code === "KeyC") {
          actionsRef.current.shootStart("home");
        }
        if (event.code === "KeyE" || event.code === "KeyZ") {
          actionsRef.current.steal("home");
        }
        if (event.code === "KeyQ") {
          actionsRef.current.switchPlayer("home");
        }
        if (event.code === "KeyR" || event.code === "KeyV") {
          actionsRef.current.slide("home");
        }
      }
      if (event.code === "KeyP" || event.code === "Escape") {
        actionsRef.current.togglePause();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      inputRef.current.keys.delete(event.code);
      const localTwoPlayer = engineRef.current?.gameMode === "local2p";
      if (localTwoPlayer) {
        if (event.code === "Space") actionsRef.current.shootRelease("home");
        if (event.code === "KeyL") actionsRef.current.shootRelease("away");
      } else if (event.code === "KeyC" || event.code === "Space") {
        actionsRef.current.shootRelease("home");
      }
    };

    const onBlur = () => {
      joystickPointer.current = null; shotPointer.current = null;
      setKnob({ x: 0, y: 0 });
      inputRef.current.keys.clear();
      inputRef.current.touchX = 0;
      inputRef.current.touchY = 0;
      inputRef.current.touchSprint = false;
      accumulator = 0;
      const state = engineRef.current;
      if (state) {
        state.chargingShot = false;
        state.chargingAwayShot = false;
        state.shotCharge = 0;
        state.awayShotCharge = 0;
        if (screenRef.current === "playing" && !state.finished) {
          state.paused = true;
          setPaused(true);
        }
      }
    };
    window.addEventListener("blur", onBlur);
    const onVisibility = () => { if (document.hidden) onBlur(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("orientationchange", onBlur);
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    animationFrame = requestAnimationFrame(loop);

    return () => {
      observer.disconnect();
      stadium?.dispose();
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("orientationchange", onBlur);
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    activeCareerSquad,
    awayFormation,
    awayTactic,
    difficulty,
    homeFormation,
    homeTactic,
    homeTeam,
    awayTeam,
    gameMode,
    playTone,
    setGameScreen,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.imageRendering = quality === "performance" ? "auto" : "auto";
  }, [quality]);

  const selectCompetition = (mode: CompetitionMode) => {
    setCompetitionMode(mode);
    if (mode === "league" || mode === "career") {
      const homeLeagueIsPlayable =
        leagueTeamsFor(homeTeam.leagueId).length >= 2;
      const selectedLeagueIsPlayable =
        leagueTeamsFor(selectedLeagueId).length >= 2;
      const leagueId = homeLeagueIsPlayable
        ? homeTeam.leagueId
        : selectedLeagueIsPlayable
          ? selectedLeagueId
          : (LEAGUES.find((league) => leagueTeamsFor(league.id).length >= 2)
              ?.id ?? "brasileirao");
      const leagueTeams = leagueTeamsFor(leagueId);
      const nextHome = leagueTeams.some((team) => team.id === homeTeam.id)
        ? homeTeam
        : leagueTeams[0];
      const opponent = leagueTeams.find((team) => team.id !== nextHome?.id);
      if (!nextHome || !opponent) return;
      setSelectedLeagueId(leagueId);
      setLeagueRows(
        mode === "career" && career.clubId === nextHome.id
          ? (career.management?.standings ?? createLeagueRows(leagueId))
          : createLeagueRows(leagueId),
      );
      setHomeIndex(TEAMS.findIndex((team) => team.id === nextHome.id));
      setAwayIndex(TEAMS.findIndex((team) => team.id === opponent.id));
      if (mode === "career" && career.clubId !== nextHome.id) {
        setCareer(createCareer(nextHome));
      }
      return;
    }
    if (mode === "cup") {
      const opponent = competitionPoolFor(homeTeam, mode, cupScope).find(
        (team) => team.id !== homeTeam.id,
      );
      const opponentIndex = TEAMS.findIndex((team) => team.id === opponent?.id);
      if (opponentIndex >= 0) setAwayIndex(opponentIndex);
    }
  };

  const selectLeague = (leagueId: LeagueId) => {
    const leagueTeams = leagueTeamsFor(leagueId);
    if (leagueTeams.length < 2) return;
    const nextHome = leagueTeams.some((team) => team.id === homeTeam.id)
      ? homeTeam
      : leagueTeams[0];
    const opponent = leagueTeams.find((team) => team.id !== nextHome.id);
    if (!opponent) return;
    setSelectedLeagueId(leagueId);
    setLeagueRows(createLeagueRows(leagueId));
    setHomeIndex(TEAMS.findIndex((team) => team.id === nextHome.id));
    setAwayIndex(TEAMS.findIndex((team) => team.id === opponent.id));
    setCupRound(0);
    setCupEliminated(false);
    if (competitionMode === "career" && career.clubId !== nextHome.id) {
      setCareer(createCareer(nextHome));
    }
  };

  const resetCup = () => {
    setCupRound(0);
    setCupEliminated(false);
  };

  const selectCupScope = (scope: CupScope) => {
    setCupScope(scope);
    resetCup();
    const opponent = competitionPoolFor(homeTeam, "cup", scope).find(
      (team) => team.id !== homeTeam.id,
    );
    const opponentIndex = TEAMS.findIndex((team) => team.id === opponent?.id);
    if (opponentIndex >= 0) setAwayIndex(opponentIndex);
  };

  const selectHomeTeam = (next: number) => {
    if (!TEAMS[next] || next === homeIndex) return;
    const nextTeam = TEAMS[next];
    const championshipMode =
      competitionMode === "league" || competitionMode === "career";
    if (championshipMode && nextTeam.leagueId !== selectedLeagueId) return;
    setHomeIndex(next);
    setCupRound(0);
    setCupEliminated(false);
    if (competitionMode === "career") setCareer(createCareer(nextTeam));
    const pool = competitionPoolFor(
      nextTeam,
      competitionMode,
      cupScope,
      selectedLeagueId,
    );
    const currentOpponentIsValid = pool.some(
      (team) => team.id === awayTeam.id && team.id !== nextTeam.id,
    );
    if (currentOpponentIsValid) return;
    const opponent = pool.find((team) => team.id !== nextTeam.id);
    const opponentIndex = TEAMS.findIndex((team) => team.id === opponent?.id);
    if (opponentIndex >= 0) setAwayIndex(opponentIndex);
  };

  const cycleHome = (direction: number) => {
    const championshipMode =
      competitionMode === "league" || competitionMode === "career";
    const pool = championshipMode ? leagueTeamsFor(selectedLeagueId) : TEAMS;
    const currentPoolIndex = pool.findIndex((team) => team.id === homeTeam.id);
    const nextPoolIndex =
      (Math.max(0, currentPoolIndex) + direction + pool.length) % pool.length;
    const next = TEAMS.findIndex((team) => team.id === pool[nextPoolIndex]?.id);
    if (next >= 0) selectHomeTeam(next);
  };

  const selectAwayTeam = (next: number) => {
    const nextTeam = TEAMS[next];
    if (
      !nextTeam ||
      nextTeam.id === homeTeam.id ||
      !availableAwayTeams.some((team) => team.id === nextTeam.id)
    ) {
      return;
    }
    setAwayIndex(next);
  };

  const cycleAway = (direction: number) => {
    const currentPoolIndex = availableAwayTeams.findIndex(
      (team) => team.id === TEAMS[awayIndex].id,
    );
    const nextPoolIndex =
      (Math.max(0, currentPoolIndex) + direction + availableAwayTeams.length) %
      availableAwayTeams.length;
    const nextIndex = TEAMS.findIndex(
      (team) => team.id === availableAwayTeams[nextPoolIndex]?.id,
    );
    if (nextIndex >= 0) selectAwayTeam(nextIndex);
  };

  const handleJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== joystickPointer.current) return;
    event.preventDefault();
    const { x, y } = joystickVector(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
    inputRef.current.touchX = x; inputRef.current.touchY = y;
    setKnob({ x, y });
  };
  const stopJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== joystickPointer.current) return;
    joystickPointer.current = null;
    inputRef.current.touchX = 0; inputRef.current.touchY = 0;
    setKnob({ x: 0, y: 0 });
  };
  const cancelTouchShot = () => {
    shotPointer.current = null;
    const state = engineRef.current;
    if (state) { state.chargingShot = false; state.shotCharge = 0; }
  };
  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement && rootRef.current?.requestFullscreen) {
        await rootRef.current.requestFullscreen();
        const orientation = window.screen.orientation as ScreenOrientation & { lock?: (mode: string) => Promise<void> };
        try { await orientation.lock?.("landscape"); } catch { /* Manual rotation stays available. */ }
        setFullscreenHint("");
      } else if (document.fullscreenElement) await document.exitFullscreen();
      else setFullscreenHint("Vire o celular na horizontal para ampliar o campo.");
    } catch { setFullscreenHint("Vire o celular na horizontal para ampliar o campo."); }
  };

  const toggleSettings = (open: boolean) => {
    const state = engineRef.current;
    if (open && state && screenRef.current === "playing") {
      state.paused = true;
      clearMatchInput(inputRef.current, state);
      joystickPointer.current = null; shotPointer.current = null;
      setKnob({ x: 0, y: 0 });
    }
    if (!open && state && screenRef.current === "playing" && !paused) {
      state.paused = false;
    }
    setSettingsOpen(open);
  };

  const resume = () => {
    const state = engineRef.current;
    if (state) state.paused = false;
    setPaused(false);
  };

  const previewCeremony = () => {
    const preview = createMatch(homeTeam, awayTeam, difficulty, true);
    preview.cupRound = 2; preview.homeScore = 1;
    finishMatch(preview);
    engineRef.current = preview;
    ceremonyPreviewRef.current = true; setCeremonyPreview(true);
    resultRecordedRef.current = true;
    setCupResult({ winner: "home", team: homeTeam, final: true, shootout: null });
    clearMatchInput(inputRef.current, preview);
    setPaused(false); setGameScreen("celebrating");
  };

  const restart = () => {
    startMatch();
  };

  const possessionTotal =
    finalStats.homePossession + finalStats.awayPossession || 1;
  const homePossession = Math.round(
    (finalStats.homePossession / possessionTotal) * 100,
  );
  const awayPossession = 100 - homePossession;

  return (
    <main
      ref={rootRef}
      className={"football-shell quality-" + quality}
      data-screen={screen}
      aria-label="Stadler Football 3D"
    >
      <section className="game-stage">
        <canvas
          ref={canvasRef}
          className="game-canvas"
          aria-label="Campo de futebol com partida em andamento"
        >
          Seu navegador precisa oferecer suporte a Canvas para rodar o jogo.
        </canvas>

        <div className="game-grain" aria-hidden="true" />

        <header className="game-brand">
          <span className="brand-mark">S</span>
          <span>
            <strong>STADLER</strong>
            <small>FOOTBALL 3D</small>
          </span>
        </header>

        {screen === "playing" && (
          <>
            <div className="scoreboard" aria-label="Placar da partida">
              <div className="score-team">
                <TeamBadge team={homeTeam} compact />
                <span>{homeTeam.short}</span>
                {hud.homeCards > 0 && (
                  <small className="card-total">
                    <i />
                    {hud.homeCards}
                  </small>
                )}
              </div>
              <strong>{hud.homeScore}</strong>
              <div className="match-clock">
                <span>{hud.half}º TEMPO</span>
                <b>{formatTime(hud.remaining)}</b>
              </div>
              <strong>{hud.awayScore}</strong>
              <div className="score-team score-team--away">
                {hud.awayCards > 0 && (
                  <small className="card-total">
                    <i />
                    {hud.awayCards}
                  </small>
                )}
                <span>{awayTeam.short}</span>
                <TeamBadge team={awayTeam} compact />
              </div>
            </div>

            {hud.setPieceKind && (
              <div
                className="set-piece-hud"
                data-ready={hud.setPieceReady}
                role="status"
              >
                <span>{setPieceName(hud.setPieceKind)}</span>
                <strong className="keyboard-set-piece">{setPieceInstruction(hud)}</strong>
                <strong className="touch-set-piece">{hud.setPieceSide === "away"
                  ? hud.gameMode === "local2p" ? "J2: use o teclado para cobrar" : "Adversário na cobrança"
                  : hud.setPieceReady ? "Analógico: mira • PASSE ou segure CHUTE" : "Aguarde para cobrar"}</strong>
              </div>
            )}

            <div className="match-tools">
              <span className="fps-pill">
                <i />
                {hud.fps} FPS
              </span>
              <button
                type="button"
                className="icon-button"
                onClick={() => actionsRef.current.togglePause()}
                aria-label="Pausar partida"
              >
                <Pause size={17} />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => toggleSettings(true)}
                aria-label="Abrir configurações"
              >
                <Settings size={17} />
              </button>
              <button
                type="button"
                className="icon-button fullscreen-button"
                onClick={() => void enterFullscreen()}
                aria-label="Tela cheia"
              >
                <Maximize2 size={17} />
              </button>
            </div>

            <div className="player-hud player-hud--home">
              <TeamBadge team={homeTeam} compact />
              <div
                className="player-number"
                style={{
                  background: homeTeam.primary,
                  color: homeTeam.primary === "#ffd60a" ? "#111619" : "#fff",
                }}
              >
                {hud.playerNumber}
              </div>
              <div className="player-info">
                <strong>{hud.playerName}</strong>
                <span>JOGADOR 1 • OVR {hud.playerOverall}</span>
                <div className="stamina-track">
                  <i
                    style={{
                      width: hud.stamina + "%",
                      background:
                        "linear-gradient(90deg, " +
                        homeTeam.primary +
                        ", #65ff8f)",
                    }}
                  />
                </div>
              </div>
            </div>

            {hud.gameMode === "local2p" && (
              <div className="player-hud player-hud--away">
                <TeamBadge team={awayTeam} compact />
                <div
                  className="player-number"
                  style={{
                    background: awayTeam.primary,
                    color: awayTeam.primary === "#ffd60a" ? "#111619" : "#fff",
                  }}
                >
                  {hud.awayPlayerNumber}
                </div>
                <div className="player-info">
                  <strong>{hud.awayPlayerName}</strong>
                  <span>JOGADOR 2 • OVR {hud.awayPlayerOverall}</span>
                  <div className="stamina-track">
                    <i
                      style={{
                        width: hud.awayStamina + "%",
                        background:
                          "linear-gradient(90deg, " +
                          awayTeam.primary +
                          ", #65ff8f)",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div
              className={
                "shot-meter" +
                (hud.gameMode === "local2p" ? " shot-meter--p1" : "")
              }
              data-visible={hud.shotCharge > 0}
            >
              <span>J1 • FORÇA DO CHUTE</span>
              <div>
                <i style={{ width: hud.shotCharge * 100 + "%" }} />
              </div>
            </div>

            {hud.gameMode === "local2p" && (
              <div
                className="shot-meter shot-meter--p2"
                data-visible={hud.awayShotCharge > 0}
              >
                <span>J2 • FORÇA DO CHUTE</span>
                <div>
                  <i style={{ width: hud.awayShotCharge * 100 + "%" }} />
                </div>
              </div>
            )}

            <button
              type="button"
              className="controls-corner-hint"
              onClick={() => actionsRef.current.togglePause()}
              aria-label="Pausar e ver controles da partida"
            >
              <kbd>P</kbd> pausa e controles
            </button>
            <p className="mobile-play-hint" role="status">{fullscreenHint || (hud.gameMode === "local2p" ? "Toque controla J1 • J2 usa teclado" : "Na borda do analógico: correr • Segure chute: força")}</p>
            <div className="touch-controls" aria-label="Controles de toque" onContextMenu={event => event.preventDefault()}>
              <span className="touch-orientation-hint">Vire o celular para uma visão mais ampla</span>
              <div
                className="joystick"
                role="group"
                aria-label="Analógico: mover; arraste até a borda para correr"
                data-sprinting={Math.hypot(knob.x, knob.y) > 0.82}
                onPointerDown={(event) => {
                  if (joystickPointer.current !== null || engineRef.current?.paused) return;
                  joystickPointer.current = event.pointerId;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  handleJoystick(event);
                }}
                onPointerMove={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    handleJoystick(event);
                  }
                }}
                onPointerUp={stopJoystick}
                onPointerCancel={stopJoystick}
                onLostPointerCapture={stopJoystick}
              >
                <i
                  style={{
                    transform:
                      "translate(" + knob.x * 28 + "px, " + knob.y * 28 + "px)",
                  }}
                />
              </div>
              <button
                type="button"
                className="touch-sprint"
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  inputRef.current.touchSprint = true;
                }}
                onPointerUp={() => {
                  inputRef.current.touchSprint = false;
                }}
                onPointerCancel={() => { inputRef.current.touchSprint = false; }}
                onLostPointerCapture={() => { inputRef.current.touchSprint = false; }}
                aria-label="Correr"
              >
                <Zap size={18} />
                <small>correr</small>
              </button>
              <div className="touch-actions">
                <button
                  type="button"
                  className="touch-button touch-button--tackle"
                  onClick={() => actionsRef.current.steal()}
                  aria-label="Dar o bote e roubar a bola"
                >
                  BOTE
                  <small>roubar</small>
                </button>
                <button
                  type="button"
                  className="touch-button touch-button--switch"
                  onClick={() => actionsRef.current.switchPlayer()}
                  aria-label="Trocar jogador selecionado"
                >
                  TROCAR
                  <small>jogador</small>
                </button>
                <button
                  type="button"
                  className="touch-button touch-button--slide"
                  onClick={() => actionsRef.current.slide()}
                  aria-label="Dar carrinho"
                >
                  CARRINHO
                </button>
                <button
                  type="button"
                  className="touch-button touch-button--pass"
                  onClick={() => actionsRef.current.pass()}
                  aria-label="Passar a bola"
                >
                  PASSE
                </button>
                <button
                  type="button"
                  className="touch-button touch-button--shoot"
                  onPointerDown={event => {
                    if (shotPointer.current !== null || engineRef.current?.paused) return;
                    event.preventDefault(); shotPointer.current = event.pointerId;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    actionsRef.current.shootStart();
                  }}
                  onPointerUp={event => {
                    if (event.pointerId !== shotPointer.current) return;
                    shotPointer.current = null; actionsRef.current.shootRelease();
                  }}
                  onPointerCancel={cancelTouchShot}
                  onLostPointerCapture={event => { if (event.pointerId === shotPointer.current) cancelTouchShot(); }}
                  onKeyDown={event => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); actionsRef.current.shootStart(); } }}
                  onKeyUp={event => { if (event.key === " " || event.key === "Enter") actionsRef.current.shootRelease(); }}
                  aria-label="Chutar a bola"
                >
                  CHUTE
                  <small>segure</small>
                </button>
              </div>
            </div>
          </>
        )}

        {hud.message && screen === "playing" && (
          <div className="match-message" data-set-piece={hud.setPieceKind !== null} role="status">
            {hud.message}
          </div>
        )}

        {screen === "menu" && (
          <div className="menu-screen">
            <div className="menu-panel">
              <p className="mobile-menu-note">Pronto para toque • Jogue na horizontal para ampliar o campo.</p>
              <div className="eyebrow">
                <span>
                  <i /> MATCHDAY
                </span>
                <span>116 CLUBES</span>
                <span>6 LIGAS</span>
              </div>
              <h1>
                <em>STADLER</em>
                FOOTBALL 3D
              </h1>
              <p>
                O estádio está pronto. Escolha seu clube, monte sua estratégia e
                faça a diferença em campo.
              </p>

              <nav
                className="competition-tabs"
                aria-label="Modos de competição"
              >
                <button
                  type="button"
                  data-active={competitionMode === "friendly"}
                  onClick={() => selectCompetition("friendly")}
                >
                  <Target />
                  <span>
                    <b>Amistoso</b>
                    <small>Partida rápida</small>
                  </span>
                </button>
                <button
                  type="button"
                  data-active={competitionMode === "league"}
                  onClick={() => selectCompetition("league")}
                >
                  <BarChart3 />
                  <span>
                    <b>Liga</b>
                    <small>Pontos corridos</small>
                  </span>
                </button>
                <button
                  type="button"
                  data-active={competitionMode === "cup"}
                  onClick={() => selectCompetition("cup")}
                >
                  <Crown />
                  <span>
                    <b>Copa</b>
                    <small>Mata-mata</small>
                  </span>
                </button>
                <button
                  type="button"
                  data-active={competitionMode === "career"}
                  onClick={() => selectCompetition("career")}
                >
                  <BriefcaseBusiness />
                  <span>
                    <b>Carreira</b>
                    <small>Clube e mercado</small>
                  </span>
                </button>
              </nav>

              {(competitionMode === "league" ||
                competitionMode === "career") && (
                <section
                  className="league-selector"
                  aria-label="Selecionar liga do campeonato"
                >
                  <div className="league-selector__heading">
                    <span>
                      <Landmark /> Escolha a liga
                    </span>
                    <small>Clubes de {selectedLeague.country}</small>
                  </div>
                  <div className="league-selector__grid">
                    {LEAGUES.map((league) => {
                      const clubs = leagueTeamsFor(league.id);
                      const playable = clubs.length >= 2;
                      return (
                        <button
                          type="button"
                          key={league.id}
                          disabled={!playable}
                          data-active={selectedLeagueId === league.id}
                          style={
                            {
                              "--league-accent": league.accent,
                            } as CSSProperties
                          }
                          onClick={() => selectLeague(league.id)}
                        >
                          <b>{league.flag}</b>
                          <span>
                            <strong>{league.name}</strong>
                            <small>
                              {playable
                                ? `${clubs.length} clubes disponíveis`
                                : "Aguardando mais clubes"}
                            </small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              <div className="matchup-selector">
                <div
                  className="team-choice"
                  style={{ "--club-color": homeTeam.primary } as CSSProperties}
                >
                  <button
                    type="button"
                    onClick={() => cycleHome(-1)}
                    aria-label="Time anterior"
                  >
                    <ChevronLeft />
                  </button>
                  <TeamFlag team={homeTeam} />
                  <button
                    type="button"
                    className="team-choice__details"
                    onClick={() => {
                      setTeamRegionFilter("all");
                      setTeamPickerSide("home");
                    }}
                    aria-label="Abrir seleção do seu time"
                  >
                    <small>SEU TIME</small>
                    <strong>{homeTeam.name}</strong>
                    <span>{leagueNameFor(homeTeam.leagueId)}</span>
                    <b className="team-choice__overall">OVR {homeOverall}</b>
                  </button>
                  <button
                    type="button"
                    onClick={() => cycleHome(1)}
                    aria-label="Próximo time"
                  >
                    <ChevronRight />
                  </button>
                </div>
                <div className="versus">VS</div>
                <div
                  className="team-choice team-choice--away"
                  style={{ "--club-color": awayTeam.primary } as CSSProperties}
                >
                  <button
                    type="button"
                    onClick={() => cycleAway(-1)}
                    aria-label="Adversário anterior"
                  >
                    <ChevronLeft />
                  </button>
                  <TeamFlag team={awayTeam} />
                  <button
                    type="button"
                    className="team-choice__details"
                    onClick={() => {
                      setTeamRegionFilter("all");
                      setTeamPickerSide("away");
                    }}
                    aria-label="Abrir seleção do adversário"
                  >
                    <small>
                      {gameMode === "local2p" ? "JOGADOR 2" : "ADVERSÁRIO"}
                    </small>
                    <strong>{awayTeam.name}</strong>
                    <span>{leagueNameFor(awayTeam.leagueId)}</span>
                    <b className="team-choice__overall">OVR {awayOverall}</b>
                  </button>
                  <button
                    type="button"
                    onClick={() => cycleAway(1)}
                    aria-label="Próximo adversário"
                  >
                    <ChevronRight />
                  </button>
                </div>
              </div>

              {(competitionMode === "league" ||
                competitionMode === "career") && (
                <section className="mode-dashboard league-dashboard">
                  <div className="mode-dashboard__heading">
                    <span>
                      <Landmark /> {leagueNameFor(selectedLeagueId)}
                    </span>
                    <small>
                      {standings.length} clubes • {standings[0]?.played ?? 0}{" "}
                      rodada(s)
                    </small>
                  </div>
                  <Table
                    className="league-table"
                    aria-label="Classificação completa da liga"
                  >
                    <TableHeader>
                      <TableRow>
                        <TableHead aria-label="Posição">#</TableHead>
                        <TableHead>Clube</TableHead>
                        <TableHead>OVR</TableHead>
                        <TableHead>J</TableHead>
                        <TableHead>V</TableHead>
                        <TableHead>E</TableHead>
                        <TableHead>D</TableHead>
                        <TableHead>GP</TableHead>
                        <TableHead>GC</TableHead>
                        <TableHead>SG</TableHead>
                        <TableHead>PTS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {standings.map((row, index) => {
                        const team = TEAMS.find(
                          (candidate) => candidate.id === row.teamId,
                        );
                        const goalDifference = row.goalsFor - row.goalsAgainst;
                        return (
                          <TableRow
                            key={row.teamId}
                            data-user={row.teamId === homeTeam.id}
                          >
                            <TableCell className="league-position">
                              {index + 1}
                            </TableCell>
                            <TableCell className="league-club">
                              <TeamBadge team={team ?? homeTeam} compact />
                              <span>{team?.name ?? row.teamId}</span>
                            </TableCell>
                            <TableCell>
                              {team ? lineupOverall(team) : "—"}
                            </TableCell>
                            <TableCell>{row.played}</TableCell>
                            <TableCell>{row.wins}</TableCell>
                            <TableCell>{row.draws}</TableCell>
                            <TableCell>{row.losses}</TableCell>
                            <TableCell>{row.goalsFor}</TableCell>
                            <TableCell>{row.goalsAgainst}</TableCell>
                            <TableCell>
                              {goalDifference > 0 ? "+" : ""}
                              {goalDifference}
                            </TableCell>
                            <TableCell className="league-points">
                              {row.points}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </section>
              )}

              {competitionMode === "cup" && (
                <section className="mode-dashboard cup-dashboard">
                  <div className="mode-dashboard__heading">
                    <span>
                      <Trophy /> {cupNameFor(homeTeam, cupScope)}
                    </span>
                    <small>
                      {cupEliminated
                        ? "Eliminado"
                        : cupRound === 3
                          ? "Campeão"
                          : "Em disputa"}
                    </small>
                  </div>
                  <div className="cup-switch" aria-label="Tipo de copa">
                    <button
                      type="button"
                      data-active={cupScope === "continental"}
                      onClick={() => selectCupScope("continental")}
                    >
                      Continental
                    </button>
                    <button
                      type="button"
                      data-active={cupScope === "world"}
                      onClick={() => selectCupScope("world")}
                    >
                      Mundial
                    </button>
                  </div>
                  <div className="cup-path">
                    {["Quartas", "Semifinal", "Final", "Taça"].map(
                      (round, index) => (
                        <span
                          key={round}
                          data-complete={index < cupRound}
                          data-current={!cupEliminated && index === cupRound}
                        >
                          {index === 3 ? <Trophy /> : index + 1}
                          <small>{round}</small>
                        </span>
                      ),
                    )}
                  </div>
                  <button type="button" className="cup-preview-button" onClick={previewCeremony}>
                    <Trophy size={15} /> Ver prévia da entrega da taça
                  </button>
                  {(cupEliminated || cupRound === 3) && (
                    <button
                      type="button"
                      className="inline-action"
                      onClick={resetCup}
                    >
                      <RotateCcw /> Nova campanha
                    </button>
                  )}
                </section>
              )}

              {careerSaveFailed && competitionMode === "career" && (
                <p role="status">
                  Não foi possível salvar no navegador. Libere espaço antes de
                  fechar o jogo.
                </p>
              )}
              {competitionMode === "career" && (
                <section className="mode-dashboard career-dashboard">
                  <div className="career-metric">
                    <WalletCards />
                    <span>
                      <small>ORÇAMENTO</small>
                      <b>€ {career.budget.toFixed(1)} mi</b>
                    </span>
                  </div>
                  <div className="career-metric">
                    <Users />
                    <span>
                      <small>TORCIDA</small>
                      <b>{career.fans.toLocaleString("pt-BR")}</b>
                    </span>
                  </div>
                  <div className="career-metric">
                    <Shield />
                    <span>
                      <small>ELENCO</small>
                      <b>{career.squad.length} atletas</b>
                    </span>
                  </div>
                  <div className="career-metric">
                    <Gauge />
                    <span>
                      <small>TIME TITULAR</small>
                      <b>OVR {careerOverall}</b>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="market-button"
                    onClick={() => setMarketOpen(true)}
                  >
                    <BriefcaseBusiness /> Central do clube
                  </button>
                </section>
              )}

              <section
                className="tactics-config"
                aria-label="Configuração tática"
              >
                <div>
                  <strong>
                    {gameMode === "local2p" ? "PLANO J1" : "SEU PLANO"}
                  </strong>
                  <label>
                    <span>Formação 8×8</span>
                    <select
                      value={homeFormation}
                      onChange={(event) =>
                        setHomeFormation(event.target.value as FormationId)
                      }
                    >
                      {Object.values(FORMATIONS).map((formation) => (
                        <option value={formation.id} key={formation.id}>
                          {formation.label} · {formation.description}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Postura</span>
                    <select
                      value={homeTactic}
                      onChange={(event) =>
                        setHomeTactic(event.target.value as TacticId)
                      }
                    >
                      {Object.values(TACTICS).map((tactic) => (
                        <option value={tactic.id} key={tactic.id}>
                          {tactic.label} · {tactic.description}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div>
                  <strong>
                    {gameMode === "local2p" ? "PLANO J2" : "PLANO RIVAL"}
                  </strong>
                  <label>
                    <span>Formação 8×8</span>
                    <select
                      value={awayFormation}
                      onChange={(event) =>
                        setAwayFormation(event.target.value as FormationId)
                      }
                    >
                      {Object.values(FORMATIONS).map((formation) => (
                        <option value={formation.id} key={formation.id}>
                          {formation.label} · {formation.description}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Postura</span>
                    <select
                      value={awayTactic}
                      onChange={(event) =>
                        setAwayTactic(event.target.value as TacticId)
                      }
                    >
                      {Object.values(TACTICS).map((tactic) => (
                        <option value={tactic.id} key={tactic.id}>
                          {tactic.label} · {tactic.description}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <div className="difficulty-row mode-row">
                <span>MODO DE JOGO</span>
                <RadioGroup
                  value={gameMode}
                  onValueChange={(value) => setGameMode(value as GameMode)}
                  className="game-radio-group"
                  aria-label="Modo de jogo"
                >
                  <label className="game-radio-option">
                    <RadioGroupItem value="solo" />
                    <span>1 JOGADOR</span>
                  </label>
                  <label className="game-radio-option">
                    <RadioGroupItem value="local2p" />
                    <span>2 JOGADORES</span>
                  </label>
                </RadioGroup>
              </div>

              <div className="difficulty-row">
                <span>
                  {gameMode === "local2p" ? "NÍVEL DA IA" : "DIFICULDADE"}
                </span>
                <RadioGroup
                  value={difficulty}
                  onValueChange={(value) => setDifficulty(value as Difficulty)}
                  className="game-radio-group"
                  aria-label="Dificuldade"
                >
                  {[
                    ["easy", "Fácil"],
                    ["normal", "Normal"],
                    ["hard", "Difícil"],
                  ].map(([value, label]) => (
                    <label className="game-radio-option" key={value}>
                      <RadioGroupItem value={value} />
                      <span>{label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="menu-actions">
                <button
                  type="button"
                  className="play-button"
                  disabled={
                    (competitionMode === "league" ||
                      competitionMode === "career") &&
                    availableAwayTeams.length === 0
                  }
                  onClick={startMatch}
                >
                  <Play fill="currentColor" size={21} />
                  {availableAwayTeams.length === 0
                    ? "TEMPORADA CONCLUÍDA"
                    : "JOGAR AGORA"}
                  <span>
                    {gameMode === "local2p" ? "2 jogadores • " : ""}
                    partida completa: 1min50
                  </span>
                </button>
                <button
                  type="button"
                  className="settings-button"
                  onClick={() => toggleSettings(true)}
                  aria-label="Configurações"
                >
                  <Settings size={20} />
                </button>
              </div>

              <div className="feature-strip">
                <span>
                  <Zap /> Domínio e passes por habilidade
                </span>
                <span>
                  <Shield /> Marcação e linhas táticas
                </span>
                <span>
                  <Gauge /> 2 tempos de 55 segundos
                </span>
              </div>
              <small className="original-note">
                Projeto independente, sem afiliação aos clubes. Escudos e marcas
                pertencem aos respectivos titulares. Clubes, elencos e escudos:
                ESPN (15/09/2026). OVR e valores de mercado são próprios desta
                simulação. Uniformes representados por cores e padrões.
              </small>
            </div>

            <div className="menu-callout">
              <div className="spotlight-club">
                <TeamFlag team={homeTeam} />
                <span>
                  {homeTeam.name}
                  <small>EM DESTAQUE</small>
                </span>
              </div>
              <span>O JOGO PASSA POR ELE</span>
              <strong>{featuredPlayer[0]}</strong>
              <div>
                <b>{featuredPlayer[2]}</b>
                <p>
                  Velocidade{" "}
                  <i style={{ width: featuredAttributes.pace + "%" }} />
                </p>
                <p>
                  Chute{" "}
                  <i style={{ width: featuredAttributes.shooting + "%" }} />
                </p>
                <p>
                  Passe{" "}
                  <i style={{ width: featuredAttributes.passing + "%" }} />
                </p>
              </div>
            </div>
          </div>
        )}

        {screen === "celebrating" && cupResult && (
          <div className="title-ceremony" aria-label="Cerimônia de entrega da taça">
            <div className="ceremony-title" role="status">
              <span>{ceremonyPreview ? "PRÉVIA DA CERIMÔNIA" : "CAMPEÃO"} • {cupNameFor(homeTeam, cupScope)}</span>
              <h2>{cupResult.team.name}</h2>
              <p>{ceremonyPreview ? "Apresentação visual • sua campanha continua intacta" : "Uma campanha. Um time. Uma conquista."}</p>
            </div>
            <button className="ceremony-skip" type="button" onClick={() => {
              seekTitleCelebration(engineRef.current, false);
              if (ceremonyPreview) { ceremonyPreviewRef.current = false; setCeremonyPreview(false); goToMenu(); }
              else setGameScreen("finished");
            }}>Pular comemoração <ChevronRight size={18} /></button>
          </div>
        )}

        {screen === "finished" && (
          <div className="finish-screen">
            <div className="finish-card">
              <Trophy className="finish-trophy" />
              <span>FIM DE JOGO</span>
              <h2>
                {cupResult?.final ? `${cupResult.team.short} CAMPEÃO!`
                  : cupResult ? (cupResult.winner === "home" ? "CLASSIFICADO!" : "ELIMINADO")
                  : hud.homeScore === hud.awayScore
                    ? "EMPATE!"
                    : hud.gameMode === "local2p"
                      ? hud.homeScore > hud.awayScore
                        ? "JOGADOR 1 VENCEU!"
                        : "JOGADOR 2 VENCEU!"
                      : hud.homeScore > hud.awayScore
                        ? "VITÓRIA!"
                        : "QUASE LÁ!"}
              </h2>
              <div className="final-score">
                <div>
                  <TeamBadge team={homeTeam} />
                  <strong>{homeTeam.short}</strong>
                </div>
                <b>{hud.homeScore}</b>
                <em>—</em>
                <b>{hud.awayScore}</b>
                <div>
                  <TeamBadge team={awayTeam} />
                  <strong>{awayTeam.short}</strong>
                </div>
              </div>
              {cupResult?.shootout && <p className="shootout-result">Pênaltis: {cupResult.shootout.home} × {cupResult.shootout.away} · cobranças simuladas</p>}
              {cupResult?.final && <button type="button" className="ceremony-replay" onClick={() => {
                if (!seekTitleCelebration(engineRef.current, true)) return;
                setGameScreen("celebrating");
              }}><Trophy size={16} /> Rever entrega da taça</button>}
              <div className="stats-table" aria-label="Estatísticas da partida">
                <div>
                  <b>{finalStats.homeShots}</b>
                  <span>Chutes</span>
                  <b>{finalStats.awayShots}</b>
                </div>
                <div>
                  <b>{finalStats.homePasses}</b>
                  <span>Passes</span>
                  <b>{finalStats.awayPasses}</b>
                </div>
                <div>
                  <b>{homePossession}%</b>
                  <span>Posse de bola</span>
                  <b>{awayPossession}%</b>
                </div>
                <div>
                  <b>{finalStats.homeFouls}</b>
                  <span>Faltas</span>
                  <b>{finalStats.awayFouls}</b>
                </div>
                <div>
                  <b>{finalStats.homeOffsides}</b>
                  <span>Impedimentos</span>
                  <b>{finalStats.awayOffsides}</b>
                </div>
                <div>
                  <b>{finalStats.homeCards}</b>
                  <span>Cartões</span>
                  <b>{finalStats.awayCards}</b>
                </div>
              </div>
              <div className="finish-actions">
                {competitionMode === "friendly" && <button type="button" className="play-button" onClick={restart}>
                  <RotateCcw size={19} /> REVANCHE
                </button>}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={goToMenu}
                >
                  MENU PRINCIPAL
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <Dialog
        open={teamPickerSide !== null}
        onOpenChange={(open) => {
          if (!open) setTeamPickerSide(null);
        }}
      >
        <DialogContent className="game-dialog team-picker-dialog">
          <DialogHeader>
            <DialogTitle>
              {teamPickerSide === "away"
                ? "Escolher adversário"
                : "Escolher seu clube"}
            </DialogTitle>
            <DialogDescription>
              Compare a média dos oito titulares. Quanto maior o OVR, mais forte
              o time será em campo.
            </DialogDescription>
          </DialogHeader>
          <div className="team-filter" aria-label="Filtrar clubes por região">
            {[
              ["all", "Todos"],
              ["brazil", "Brasileirão"],
              ["europe", "Europa"],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                data-active={teamRegionFilter === value}
                onClick={() => setTeamRegionFilter(value as TeamRegionFilter)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="team-picker-summary">
            <span>{teamPickerOptions.length} clubes disponíveis</span>
            <small>OVR = média da escalação</small>
          </div>
          <div className="team-picker-grid">
            {teamPickerOptions.length === 0 && (
              <p className="team-picker-empty">
                Nenhum clube desta região participa do torneio selecionado.
              </p>
            )}
            {teamPickerOptions.map((team) => {
              const index = TEAMS.findIndex(
                (candidate) => candidate.id === team.id,
              );
              const selected =
                teamPickerSide === "away"
                  ? team.id === awayTeam.id
                  : team.id === homeTeam.id;
              const overall =
                team.id === homeTeam.id && teamPickerSide !== "away"
                  ? homeOverall
                  : team.id === awayTeam.id && teamPickerSide === "away"
                    ? awayOverall
                    : lineupOverall(
                        team,
                        teamPickerSide === "away"
                          ? awayFormation
                          : homeFormation,
                      );
              return (
                <button
                  type="button"
                  className="team-picker-card"
                  data-selected={selected}
                  key={team.id}
                  onClick={() => {
                    if (teamPickerSide === "away") selectAwayTeam(index);
                    else selectHomeTeam(index);
                    setTeamPickerSide(null);
                  }}
                  aria-label={`Selecionar ${team.name}, OVR ${overall}`}
                >
                  <TeamFlag team={team} />
                  <span>
                    <strong>{team.name}</strong>
                    <small>
                      {team.flag} {team.city}
                    </small>
                  </span>
                  <b>{overall}</b>
                </button>
              );
            })}
          </div>
          <p className="team-picker-hint">
            Velocidade, passe, finalização, domínio, desarme e goleiro usam o
            OVR de cada atleta e a força relativa do rival.
          </p>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={toggleSettings}>
        <DialogContent className="game-dialog">
          <DialogHeader>
            <DialogTitle>Configurações do jogo</DialogTitle>
            <DialogDescription>
              Escolha o nível visual. O modo Ultra ativa a apresentação mais
              rica e imersiva do estádio.
            </DialogDescription>
          </DialogHeader>
          <div className="settings-section">
            <div className="settings-heading">
              <span>
                <Gauge size={18} />
                Qualidade gráfica
              </span>
              <small>Recomendado: ultra</small>
            </div>
            <RadioGroup
              value={quality}
              onValueChange={(value) => setQuality(value as Quality)}
              className="quality-options"
              aria-label="Qualidade gráfica"
            >
              <label>
                <RadioGroupItem value="performance" />
                <span>
                  <b>Desempenho</b>
                  <small>Mais FPS</small>
                </span>
              </label>
              <label>
                <RadioGroupItem value="balanced" />
                <span>
                  <b>Equilibrado</b>
                  <small>Boa imagem</small>
                </span>
              </label>
              <label>
                <RadioGroupItem value="ultra" />
                <span>
                  <b>Ultra</b>
                  <small>Mais detalhes</small>
                </span>
              </label>
            </RadioGroup>
          </div>
          <div className="setting-toggle">
            <span>
              {audioEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
              <span>
                <b>Efeitos sonoros</b>
                <small>Chutes, apito e gols</small>
              </span>
            </span>
            <Switch
              checked={audioEnabled}
              onCheckedChange={setAudioEnabled}
              aria-label="Ativar efeitos sonoros"
            />
          </div>
          <button
            type="button"
            className="dialog-done"
            onClick={() => toggleSettings(false)}
          >
            SALVAR E VOLTAR
          </button>
        </DialogContent>
      </Dialog>

      <Dialog open={marketOpen} onOpenChange={setMarketOpen}>
        <DialogContent className="game-dialog market-dialog">
          <DialogHeader>
            <DialogTitle>Central do clube · {careerTeam.name}</DialogTitle>
            <DialogDescription>
              Escalação, contratos, mercado, base e objetivos da diretoria.
            </DialogDescription>
          </DialogHeader>
          <CareerOffice
            career={career}
            onChange={setCareer}
            onNewSeason={() =>
              setLeagueRows(createLeagueRows(selectedLeagueId))
            }
          />
          <button
            type="button"
            className="dialog-done"
            onClick={() => setMarketOpen(false)}
          >
            VOLTAR AO CAMPO
          </button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={paused && screen === "playing"}
        onOpenChange={(open) => {
          if (!open) resume();
        }}
      >
        <DialogContent className="game-dialog pause-dialog">
          <DialogHeader>
            <DialogTitle>Jogo pausado</DialogTitle>
            <DialogDescription>
              Respire, ajuste a estratégia e volte para a partida.
            </DialogDescription>
          </DialogHeader>
          <div className="pause-controls" aria-label="Controles da partida">
            <section>
              <strong>
                {gameMode === "local2p" ? "Jogador 1" : "Jogador"}
              </strong>
              <span>
                <kbd>WASD</kbd> mover
              </span>
              <span>
                <kbd>SHIFT</kbd> correr
              </span>
              <span>
                <kbd>F</kbd> passe
              </span>
              <span>
                <kbd>ESPAÇO</kbd> chute
              </span>
              <span>
                <kbd>E</kbd> roubar
              </span>
              <span>
                <kbd>Q</kbd> trocar
              </span>
              <span>
                <kbd>R</kbd> carrinho
              </span>
            </section>
            {gameMode === "local2p" && (
              <section>
                <strong>Jogador 2</strong>
                <span>
                  <kbd>SETAS</kbd> mover
                </span>
                <span>
                  <kbd>ENTER</kbd> correr
                </span>
                <span>
                  <kbd>K</kbd> passe
                </span>
                <span>
                  <kbd>L</kbd> chute
                </span>
                <span>
                  <kbd>J</kbd> roubar
                </span>
                <span>
                  <kbd>I</kbd> trocar
                </span>
                <span>
                  <kbd>U</kbd> carrinho
                </span>
              </section>
            )}
          </div>
          <button type="button" className="play-button" onClick={resume}>
            <Play fill="currentColor" size={19} /> CONTINUAR
          </button>
          <button type="button" className="secondary-button" onClick={restart}>
            <RotateCcw size={18} /> REINICIAR PARTIDA
          </button>
          <button type="button" className="text-button" onClick={goToMenu}>
            VOLTAR AO MENU
          </button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
