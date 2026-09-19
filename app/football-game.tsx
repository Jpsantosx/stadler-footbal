"use client";
import {
  advanceCareerRound,
  careerMatchSquad,
  careerOpponentSquad,
  ensureManagement,
} from "@/lib/football-career";
import { joystickVector, clearMatchInput } from "@/lib/football-input";
import { updateTitleCelebration, seekTitleCelebration } from "@/lib/football-presentation";
import { createFramePresenter } from "@/lib/football-frame";
import { createRenderBudget } from "@/lib/football-performance";
import { drawRadar } from "@/lib/football-radar";
import { DEFAULT_PRESENTATION, parsePresentation, type PresentationSettings, type CameraMode, type StadiumLight } from "@/lib/football-camera";
import { createStadiumRenderer } from "@/lib/football-webgl";
import { CareerHub, TrainingHub, MatchCentre } from './football-hub';
import { createTraining, tickTraining, resetTraining, trainingHint } from '@/lib/football-training';
import { JOURNEY_KEY, parsePlayerCareer, makePlayerCareerMatch, settlePlayerCareer, type PlayerCareer } from '@/lib/football-player-career';
import { setLiveTactics, substitutePlayer, type TrainingKind } from '@/lib/football-engine';
import { playStadiumReaction } from '@/lib/football-audio';
import CareerOffice from "./career-office";
import AdvancedControls from './advanced-controls';
import { createGoalReplay } from '@/lib/football-replay';
import { DEFAULT_CONTROLS, parseControls, shotModifiers, rumble, type ControlPreferences } from '@/lib/football-controls';
import { performSkill, type ShotKind } from '@/lib/football-engine';
import ControllerSettings from "./controller-settings";
import { createGamepadDriver, beginPadCalibration, advancePadCalibration, parsePadProfiles, CALIBRATION_STEPS, padButtonLabel, type PadInfo, type PadProfiles, type PadCalibration, type PadSample } from "@/lib/football-gamepad";
import { navigateGamepadMenu } from "@/lib/football-gamepad-menu";

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
  movementIntent,
  chooseDirectionalPassTarget,
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
  Camera,
  Sun,
  Gauge,
  Gamepad2,
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
  const replayRef = useRef(createGoalReplay());
  const [replaying,setReplaying] = useState(false);
  const [controls,setControls] = useState<ControlPreferences>(DEFAULT_CONTROLS);
  const controlsRef = useRef(DEFAULT_CONTROLS);
  const shotKindsRef = useRef<Record<Side,ShotKind>>({home:'auto',away:'auto'});
  const [editingTouch,setEditingTouch] = useState(false);
  const editingTouchRef = useRef(false);
  const dragControlRef = useRef<{id:number;key:string}|null>(null);
  const saveControls = (next:ControlPreferences) => {
    const safe=parseControls(next);controlsRef.current=safe;setControls(safe);
    try{localStorage.setItem('stadler-controls-v2',JSON.stringify(safe));}catch{/* Session still works. */}
  };
  const controlStyle = (key:string):CSSProperties => {
    const pos=controls.layout[key];
    return pos ? {position:'fixed',left:`clamp(68px, ${pos.x*100}vw, calc(100vw - 68px))`,top:`clamp(68px, ${pos.y*100}vh, calc(100vh - 68px))`,right:'auto',bottom:'auto',transform:`translate(-50%, -50%) scale(${controls.touchScale})`} : {transform:`scale(${controls.touchScale})`};
  };
  const editControlMove = (event:ReactPointerEvent<HTMLDivElement>) => {
    const drag=dragControlRef.current;if(!drag||drag.id!==event.pointerId)return;
    event.preventDefault();event.stopPropagation();
    saveControls({...controlsRef.current,layout:{...controlsRef.current.layout,[drag.key]:{x:event.clientX/window.innerWidth,y:event.clientY/window.innerHeight}}});
  };
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const radarRef = useRef<HTMLCanvasElement | null>(null);
  const joystickPointer = useRef<number | null>(null);
  const shotPointer = useRef<number | null>(null);
  const passPointer = useRef<{ id: number; started: number } | null>(null);
  const [fullscreenHint, setFullscreenHint] = useState("");
  const rootRef = useRef<HTMLElement | null>(null);
  const engineRef = useRef<MatchState | null>(null);
  const screenRef = useRef<Screen>("menu");
  const qualityRef = useRef<Quality>("ultra");
  const presentationRef = useRef<PresentationSettings>(DEFAULT_PRESENTATION);
  const gamepadDriverRef = useRef<ReturnType<typeof createGamepadDriver> | null>(null);
  const padProfilesRef = useRef<PadProfiles>({});
  const calibrationRef = useRef<PadCalibration | null>(null);
  const audioEnabledRef = useRef(true);
  const inputRef = useRef<InputState>({
    keys: new Set<string>(),
    touchX: 0,
    touchY: 0,
    touchSprint: false,
  });
  const preparedMatchRef = useRef<MatchState|null>(null);
  const journeyRef = useRef<PlayerCareer|null>(null);
  const [journey,setJourney] = useState<PlayerCareer|null>(null);
  const [journeySaveFailed,setJourneySaveFailed] = useState(false);
  const [journeyOpen,setJourneyOpen] = useState(false);
  const [trainingOpen,setTrainingOpen] = useState(false);
  const [specialMode,setSpecialMode] = useState<'player'|'training'|null>(null);
  const [trainingStatus,setTrainingStatus] = useState<ReturnType<typeof trainingHint>>(null);
  const [matchCentre,setMatchCentre] = useState<MatchState|null>(null);
  const saveJourney = useCallback((next:PlayerCareer) => {
    journeyRef.current=next;setJourney(next);
    try { localStorage.setItem(JOURNEY_KEY,JSON.stringify(next));setJourneySaveFailed(false); }
    catch { setJourneySaveFailed(true); }
  },[]);
  useEffect(()=>{const timer=window.setTimeout(()=>{
    try {const saved=parsePlayerCareer(JSON.parse(localStorage.getItem(JOURNEY_KEY)??'null'));journeyRef.current=saved;setJourney(saved);}catch{/* Invalid save opens the creator. */}
  },0);return()=>window.clearTimeout(timer);},[]);
  const openMatchCentre = () => { const state=engineRef.current;if(state){state.paused=true;clearMatchInput(inputRef.current,state);setMatchCentre(structuredClone(state));} };
  const skipReplay = () => {replayRef.current.skip();setReplaying(false);clearMatchInput(inputRef.current,engineRef.current);gamepadDriverRef.current?.reset();};
  const actionsRef = useRef<GameActions>({
    pass: () => undefined,
    skill: () => undefined,
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
  const [presentation, setPresentation] = useState<PresentationSettings>(DEFAULT_PRESENTATION);
  const [rendererStatus, setRendererStatus] = useState<"starting" | "webgl" | "canvas" | "unavailable">("starting");
  const [passTargetName, setPassTargetName] = useState("");
  const [padInfos,setPadInfos]=useState<PadInfo[]>([]);
  const [padProfiles,setPadProfiles]=useState<PadProfiles>({});
  const [calibration,setCalibration]=useState<PadCalibration|null>(null);
  const [controllerNotice,setControllerNotice]=useState("");
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
        const profiles=parsePadProfiles(JSON.parse(window.localStorage.getItem("stadler-controllers-v1")||"{}"));
        padProfilesRef.current=profiles;setPadProfiles(profiles);
      } catch { /* A missing controller profile uses browser standard mapping. */ }
      try {
        const savedControls=parseControls(JSON.parse(window.localStorage.getItem('stadler-controls-v2')||'{}'));controlsRef.current=savedControls;setControls(savedControls);
        const preferences = JSON.parse(window.localStorage.getItem("stadler-presentation-v1") || "{}");
        setPresentation(parsePresentation(preferences));
        if (["performance","balanced","ultra"].includes(preferences.quality)) setQuality(preferences.quality);
        else if (window.matchMedia("(pointer: coarse)").matches) setQuality("balanced");
        if (typeof preferences.audioEnabled === "boolean") setAudioEnabled(preferences.audioEnabled);
      } catch { /* Corrupt or unavailable preferences use playable defaults. */ }
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
    if (state.careerFixture && journeyRef.current) { saveJourney(settlePlayerCareer(journeyRef.current,state)); return; }
    if (state.training) return;
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
  }, [competitionMode, screen, leagueRows, saveJourney]);

  const playTone = useCallback(
    (kind: "kick" | "goal" | "whistle" | "tackle") => {
      if (!audioEnabledRef.current) return;
      try {
        const AudioCtor = window.AudioContext;
        const audio = audioContextRef.current ?? new AudioCtor();
        audioContextRef.current = audio;
        if (audio.state === "suspended") void audio.resume();
        playStadiumReaction(audio,kind);
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
      !preparedMatchRef.current && competitionMode === "career" &&
      ensureManagement(career).management.status === "sacked"
    ) {
      setMarketOpen(true);
      return;
    }
    const prepared = preparedMatchRef.current;
    const matchHome = prepared?.homeTeam ?? TEAMS[homeIndex];
    const validOpponentPool = availableAwayTeams;
    const matchAway = prepared?.awayTeam ??
      validOpponentPool.find((team) => team.id === TEAMS[awayIndex]?.id) ??
      validOpponentPool[0];
    if (!matchAway) return;
    const safeAwayIndex = TEAMS.findIndex((team) => team.id === matchAway.id);
    if (safeAwayIndex !== awayIndex) setAwayIndex(safeAwayIndex);
    const next = prepared ?? createMatch(
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
    preparedMatchRef.current=null;
    if (!prepared) next.cupRound = competitionMode === "cup" ? cupRound : null;
    if(prepared){setHomeIndex(TEAMS.findIndex(t=>t.id===next.homeTeam.id));setAwayIndex(TEAMS.findIndex(t=>t.id===next.awayTeam.id));setGameMode('solo');}
    setSpecialMode(next.training?'training':next.careerFixture?'player':null);
    setTrainingStatus(trainingHint(next));setJourneyOpen(false);setTrainingOpen(false);setMatchCentre(null);
    const selected = getPlayer(next, next.selectedId);
    const selectedAway = getPlayer(next, next.selectedAwayId);
    replayRef.current.reset();setReplaying(false);
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

  const launchCareerMatch = () => {
    const career=journeyRef.current;if(!career)return;
    const match=makePlayerCareerMatch(career,difficulty);if(!match)return;
    preparedMatchRef.current=match;startMatch();
  };
  const launchTraining = (kind:TrainingKind) => {preparedMatchRef.current=createTraining(kind,homeTeam);startMatch();};
  const goToMenu = useCallback(() => {
    setSpecialMode(null);setTrainingStatus(null);setMatchCentre(null);
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
    presentationRef.current = presentation;
    if (!careerReady) return;
    try { window.localStorage.setItem("stadler-presentation-v1", JSON.stringify({...presentation,quality,audioEnabled})); }
    catch { /* Private browsing may disable preference storage. */ }
  }, [presentation, quality, audioEnabled, careerReady]);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  useEffect(() => {
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
  }, [homeTeam, awayTeam, difficulty, gameMode, homeFormation, awayFormation, homeTactic, awayTactic, activeCareerSquad]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const stadium = canvas.dataset.renderer === "canvas" ? null : createStadiumRenderer(canvas);
    const context = stadium ? null : canvas.getContext("2d", { alpha: false });
    if (!stadium && !context) {
      const timer=window.setTimeout(()=>setRendererStatus("unavailable"),0);
      return ()=>window.clearTimeout(timer);
    }
    const readyTimer=window.setTimeout(()=>setRendererStatus(stadium?"webgl":"canvas"),0);
    const presenter = createFramePresenter();
    const renderBudget = createRenderBudget();
    let renderScale = 1;
    let renderQuality = qualityRef.current;
    let requestedQuality = qualityRef.current;
    const gamepads = createGamepadDriver();gamepadDriverRef.current=gamepads;
    let previousCrowdCue="";
    let controllerDigest="";
    let controllerError="";
    let pageFocused=true;
    const pollControllers=(state:MatchState, now:number) => {
      let pads: (Gamepad|null)[]=[];
      try {
        if(!navigator.getGamepads)throw new Error("Este navegador não oferece suporte a controles. Abra o jogo em um navegador compatível.");
        pads=Array.from(navigator.getGamepads());
      } catch {
        const message="Não foi possível acessar controles neste navegador. Abra o link do jogo diretamente e verifique a conexão USB/Bluetooth.";
        if(controllerError!==message){controllerError=message;setControllerNotice(message);}
      }
      const configuring=calibrationRef.current;
      if(configuring) {
        const pad=pads.find(p=>p?.index===configuring.index && p.id===configuring.id);
        if(!pad) {calibrationRef.current=null;setCalibration(null);setControllerNotice("Controle desconectado durante a configuração. Reconecte para tentar novamente.");}
        else {
          const next=advancePadCalibration(configuring,pad);
          if(next!==configuring) {
            if(next.step>=CALIBRATION_STEPS.length) {
              const profiles={...padProfilesRef.current,[next.id]:next.profile};
              padProfilesRef.current=profiles;setPadProfiles(profiles);
              try {window.localStorage.setItem("stadler-controllers-v1",JSON.stringify(profiles));setControllerNotice("Controle configurado e salvo neste navegador.");}
              catch {setControllerNotice("Controle configurado para esta sessão; o navegador não permitiu salvar.");}
              calibrationRef.current=null;setCalibration(null);gamepads.reset();
            } else {calibrationRef.current=next;setCalibration(next);}
          }
        }
      }
      const active=screenRef.current==="playing" && !state.paused && !replayRef.current.active;
      const context=!pageFocused || document.hidden || editingTouchRef.current || !!calibrationRef.current ? "blocked" : active ? "playing" : "menu";
      const frame=gamepads.poll(pads as (PadSample|null)[],state.gameMode,context,now,padProfilesRef.current,controlsRef.current.sensitivity);
      const digest=JSON.stringify(frame.infos);
      if(digest!==controllerDigest){controllerDigest=digest;setPadInfos(frame.infos);}
      inputRef.current.controllers=frame.inputs;
      if(frame.disconnected.length) {
        clearMatchInput(inputRef.current,state);gamepads.reset();
        setControllerNotice("Controle desconectado. Reconecte e pressione um botão, ou continue com teclado/toque.");
        if(active)actionsRef.current.togglePause();
        return;
      }
      if(context==="blocked")return;
      if(replayRef.current.active){
        if(frame.events.some(e=>['confirm','back','pause'].includes(e.action))) {replayRef.current.skip();setReplaying(false);clearMatchInput(inputRef.current,state);gamepads.reset();}
        return;
      }
      if(frame.events.some(e=>e.action==="pause")) {
        if(active)actionsRef.current.togglePause();
        else if(screenRef.current==="playing" && state.paused && !document.querySelector('[role="dialog"]'))actionsRef.current.togglePause();
        else navigateGamepadMenu("pause");
        return;
      }
      for(const event of frame.events) {
        if(context==="menu") {
          if(["up","down","left","right","confirm","back"].includes(event.action)) {
            if(screenRef.current==="celebrating" && (event.action==="confirm"||event.action==="back"))document.querySelector<HTMLButtonElement>('.ceremony-skip')?.click();
            else navigateGamepadMenu(event.action as "up"|"down"|"left"|"right"|"confirm"|"back");
          }
        } else {
          const action=actionsRef.current;
          if(['shootRelease','rainbow','bicycle','slide'].includes(event.action)){
            const seat=frame.infos.find(i=>i.side===event.side);const pad=pads.find(p=>p?.index===seat?.index);
            void rumble(pad,controlsRef.current.vibration,event.action==='bicycle'?.65:.35,100);
          }
          if(event.action==='rainbow'||event.action==='feint'||event.action==='bicycle'||event.action==='crossHigh'||event.action==='crossLow'||event.action==='oneTwo')action.skill(event.action,event.side);
          else if(event.action==="pass"||event.action==="through")action.pass(event.side,event.action==="through");
          else if(event.action==="shootStart") {
            const owner=getPlayer(state,state.ball.owner);
            if(owner?.side!==event.side && !state.setPiece && state.ball.z<.6)action.steal(event.side);
            else action.shootStart(event.side);
          }
          else if(event.action==="shootRelease")action.shootRelease(event.side);
          else if(event.action==="slide")action.slide(event.side);
          else if(event.action==="steal")action.steal(event.side);
          else if(event.action==="switch")action.switchPlayer(event.side);
        }
      }
    };
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
        renderQuality === "performance"
          ? 1
          : renderQuality === "balanced"
            ? 1.45
            : 2;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr) * renderScale;
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
      setTrainingStatus(trainingHint(state));
      const selected = getPlayer(state, state.selectedId);
      const selectedAway = getPlayer(state, state.selectedAwayId);
      const aim=movementIntent(inputRef.current,"home",state.gameMode);
      const receiver=selected?.id===state.ball.owner ? chooseDirectionalPassTarget(state,selected,aim) : undefined;
      setPassTargetName(receiver?.name ?? "");
      const radarContext = radarRef.current?.getContext("2d");
      if (radarContext && presentationRef.current.radar) {
        radarContext.setTransform(2, 0, 0, 2, 0, 0);
        drawRadar(radarContext, state);
      }
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
      const budget = renderBudget.sample(frameTime, qualityRef.current, presentationRef.current.automatic, !document.hidden && !state?.paused);
      if (budget.scale !== renderScale || budget.quality !== renderQuality || requestedQuality !== qualityRef.current) {
        renderScale = budget.scale; renderQuality = budget.quality; requestedQuality = qualityRef.current;
        resize();
      }
      if (state) {
        pollControllers(state,now);
        const demo = screenRef.current === "menu";
        if (demo || screenRef.current === "playing") {
          if (state.paused || document.hidden || replayRef.current.active) accumulator = 0;
          else {
            accumulator += dt * (demo ? 0.62 : 1);
            while (accumulator >= 1 / 120) {
              presenter.capture(state);
              if(!demo)replayRef.current.record(state,1/120);
              const goalsBefore=state.homeScore+state.awayScore;
              updateMatch(state, inputRef.current, 1 / 120, demo);
              if(state.training)tickTraining(state);
              accumulator -= 1 / 120;
              if(state.homeScore+state.awayScore!==goalsBefore){accumulator=0;break;}
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
          if (screenRef.current === "playing") {
            playTone("goal");
            if(!state.training&&replayRef.current.start(state)){setReplaying(true);clearMatchInput(inputRef.current,state);gamepads.reset();}
            try{for(const pad of navigator.getGamepads?.()??[])if(pad?.connected)void rumble(pad,controlsRef.current.vibration,.8,300);}catch{/* Unsupported gamepads. */}
          }
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
        if(state.message!==previousCrowdCue){
          if(screenRef.current==='playing' && audioEnabledRef.current && audioContextRef.current && /DEFESA|ESPALMA|TRAVESSÃO|TRAVE/.test(state.message))playStadiumReaction(audioContextRef.current,'save');
          previousCrowdCue=state.message;
        }

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

        const wasReplayActive=replayRef.current.active;
        const replayVisual=wasReplayActive?replayRef.current.sample(document.hidden||state.paused?0:dt):null;
        if(wasReplayActive&&!replayRef.current.active){setReplaying(false);clearMatchInput(inputRef.current,state);gamepads.reset();}
        const visual = replayVisual ?? presenter.sample(state, state.paused || state.finished || screenRef.current !== "playing" ? 1 : accumulator * 120);
        if (stadium) stadium.render(visual, renderQuality, replayVisual?{...presentationRef.current,camera:"close"}:presentationRef.current);
        else if (context) {
          context.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
          drawScene(context, view, visual, renderQuality, replayVisual?{...presentationRef.current,camera:"close"}:presentationRef.current);
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
      skill: (kind,side='home') => {
        const state=engineRef.current;if(!state||screenRef.current!=='playing'||replayRef.current.active||editingTouchRef.current)return;
        if(performSkill(state,side,kind))playTone('kick');
      },
      pass: (side = "home", through = false) => {
        const state = engineRef.current;
        if (!state || state.paused || screenRef.current !== "playing" || replayRef.current.active || editingTouchRef.current) return;
        if (state.setPiece) {
          if (state.setPiece.side === side && state.setPiece.ready) {
            executeSetPiece(state, "pass");
            playTone("kick");
          }
          return;
        }
        const intent = movementIntent(inputRef.current,side,state.gameMode);
        if (passBall(state,side,intent,through)) playTone("kick");
      },
      shootStart: (side = "home") => {
        const input=inputRef.current, pad=input.controllers?.[side];
        const shield=!!pad?.shield || (side==='home'?(input.keys.has('KeyH')||!!input.touchShield):input.keys.has('Numpad0'));
        const sprint=!!pad?.sprint || (side==='home'?(input.keys.has('ShiftLeft')||input.keys.has('ShiftRight')):input.keys.has('Enter'));
        shotKindsRef.current[side]=shotModifiers(shield,sprint);
        if(side==='home'&&shotPointer.current!==null)shotKindsRef.current.home=controlsRef.current.touchShot;
        const state = engineRef.current;
        if (!state || state.paused || screenRef.current !== "playing" || replayRef.current.active || editingTouchRef.current) return;
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
        if(state.ball.owner===null && state.ball.z>.6){
          if(performSkill(state,side,state.ball.z>2.15?'header':'volley'))playTone('kick');return;
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
        if (!state || !charging || state.paused || replayRef.current.active || editingTouchRef.current) return;
        if (state.setPiece?.side === side && state.setPiece.ready) {
          executeSetPiece(state, "shot");
        } else {
          releaseShot(state, side,shotKindsRef.current[side]);
        }
        playTone("kick");
      },
      steal: (side = "home") => {
        const state = engineRef.current;
        if (!state || state.paused || screenRef.current !== "playing" || replayRef.current.active || editingTouchRef.current) return;
        if (state.setPiece) return;
        stealBall(state, side);
        playTone("tackle");
      },
      switchPlayer: (side = "home") => {
        const state = engineRef.current;
        if (!state || state.paused || screenRef.current !== "playing" || replayRef.current.active || editingTouchRef.current) return;
        if (state.setPiece) return;
        switchToClosestPlayer(state, side);
      },
      slide: (side = "home") => {
        const state = engineRef.current;
        if (!state || state.paused || screenRef.current !== "playing" || replayRef.current.active || editingTouchRef.current) return;
        if (state.setPiece) return;
        slideTackle(state, side);
        playTone("tackle");
      },
      togglePause: () => {
        const state = engineRef.current;
        if (!state || screenRef.current !== "playing") return;
        state.paused = !state.paused;
        clearMatchInput(inputRef.current, state);
        gamepads.reset();
        joystickPointer.current = null; shotPointer.current = null; passPointer.current = null;
        setKnob({ x: 0, y: 0 });
        setPaused(state.paused);
      },
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (screenRef.current !== "playing" || editingTouchRef.current) return;
      if(replayRef.current.active){if(['Space','Escape','Enter'].includes(event.code)){event.preventDefault();skipReplay();}return;}
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog && !dialog.classList.contains("pause-dialog")) return;
      if (engineRef.current?.paused && event.code !== "KeyP" && event.code !== "Escape") return;
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
      const keys=inputRef.current.keys;
      if(event.code==='KeyN'){event.preventDefault();actionsRef.current.skill('crossHigh');return;}
      if(event.code==='KeyM'){event.preventDefault();actionsRef.current.skill('crossLow');return;}
      if(event.code==='KeyY'){event.preventDefault();actionsRef.current.skill('oneTwo');return;}
      if(event.code==='KeyG'||(keys.has('KeyH')&&event.code==='KeyF')){event.preventDefault();actionsRef.current.skill('rainbow');return;}
      if(event.code==='KeyT'||(keys.has('KeyH')&&event.code==='KeyR')){event.preventDefault();actionsRef.current.skill('feint');return;}
      if(event.code==='KeyB'||(keys.has('KeyH')&&event.code==='KeyE')){event.preventDefault();actionsRef.current.skill('bicycle');return;}
      if(localTwoPlayer&&keys.has('Numpad0')&&['KeyK','KeyU','KeyJ'].includes(event.code)){event.preventDefault();actionsRef.current.skill(event.code==='KeyK'?'rainbow':event.code==='KeyU'?'feint':'bicycle','away');return;}
      if (localTwoPlayer) {
        if (event.code === "KeyF") actionsRef.current.pass("home", inputRef.current.keys.has("ShiftLeft"));
        if (event.code === "Space") actionsRef.current.shootStart("home");
        if (event.code === "KeyE") actionsRef.current.steal("home");
        if (event.code === "KeyQ") actionsRef.current.switchPlayer("home");
        if (event.code === "KeyR") actionsRef.current.slide("home");
        if (event.code === "KeyK") actionsRef.current.pass("away", inputRef.current.keys.has("Enter"));
        if (event.code === "KeyL") actionsRef.current.shootStart("away");
        if (event.code === "KeyJ") actionsRef.current.steal("away");
        if (event.code === "KeyI") actionsRef.current.switchPlayer("away");
        if (event.code === "KeyU") actionsRef.current.slide("away");
      } else {
        if (event.code === "KeyF" || event.code === "KeyX") {
          actionsRef.current.pass("home", inputRef.current.keys.has("ShiftLeft") || inputRef.current.keys.has("ShiftRight"));
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

    const onMouseDown = (event:PointerEvent) => {
      if(event.pointerType!=='mouse'||screenRef.current!=='playing'||engineRef.current?.paused||editingTouchRef.current||replayRef.current.active)return;
      event.preventDefault();canvas.setPointerCapture(event.pointerId);
      if(event.button===0)actionsRef.current.shootStart();
      if(event.button===2){if(inputRef.current.keys.has('KeyH'))actionsRef.current.skill('rainbow');else actionsRef.current.pass();}
      if(event.button===1)actionsRef.current.skill(inputRef.current.keys.has('KeyH')?'bicycle':'feint');
    };
    const onMouseUp = (event:PointerEvent) => {if(event.pointerType==='mouse'&&event.button===0)actionsRef.current.shootRelease();};
    const onMouseCancel = () => {clearMatchInput(inputRef.current,engineRef.current);};
    const onContext = (event:Event) => event.preventDefault();
    canvas.addEventListener('pointerdown',onMouseDown);canvas.addEventListener('pointerup',onMouseUp);
    canvas.addEventListener('pointercancel',onMouseCancel);canvas.addEventListener('contextmenu',onContext);
    const onBlur = () => {
      pageFocused=false;gamepads.reset();inputRef.current.controllers={};
      joystickPointer.current = null; shotPointer.current = null; passPointer.current = null;
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
    const onFocus=()=>{pageFocused=true;gamepads.reset();};
    const onOrientation=()=>{const focused=pageFocused;onBlur();pageFocused=focused;};
    window.addEventListener("focus",onFocus);
    window.addEventListener("blur", onBlur);
    const onVisibility = () => { if (document.hidden) onBlur(); else onFocus(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("orientationchange", onOrientation);
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    animationFrame = requestAnimationFrame(loop);

    return () => {
      window.clearTimeout(readyTimer);
      observer.disconnect();
      stadium?.dispose();
      window.removeEventListener("focus",onFocus);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("orientationchange", onOrientation);
      cancelAnimationFrame(animationFrame);
      canvas.removeEventListener('pointerdown',onMouseDown);canvas.removeEventListener('pointerup',onMouseUp);
      canvas.removeEventListener('pointercancel',onMouseCancel);canvas.removeEventListener('contextmenu',onContext);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [playTone, setGameScreen]);

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
    if(!open){calibrationRef.current=null;setCalibration(null);}
    gamepadDriverRef.current?.reset();
    const state = engineRef.current;
    if (open && state && screenRef.current === "playing") {
      state.paused = true;
      clearMatchInput(inputRef.current, state);
      joystickPointer.current = null; shotPointer.current = null; passPointer.current = null;
      setKnob({ x: 0, y: 0 });
    }
    if (!open && state && screenRef.current === "playing" && !paused && !editingTouchRef.current) {
      state.paused = false;
    }
    setSettingsOpen(open);
  };

  const resume = () => {
    gamepadDriverRef.current?.reset();
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
    const state=engineRef.current;
    if(state?.training){preparedMatchRef.current=createTraining(state.training.kind,state.homeTeam);startMatch();}
    else if(state?.careerFixture)launchCareerMatch();
    else startMatch();
  };

  const possessionTotal =
    finalStats.homePossession + finalStats.awayPossession || 1;
  const homePossession = Math.round(
    (finalStats.homePossession / possessionTotal) * 100,
  );
  const awayPossession = 100 - homePossession;
  const setPiecePad=padInfos.find(p=>p.usable && p.side===hud.setPieceSide && (p.side==="home" || hud.gameMode==="local2p"));
  const setPieceControllerHint = setPiecePad
    ? !hud.setPieceReady ? "Aguarde para cobrar"
      : setPiecePad.custom ? "Analógico: mira · botão de passe ou segure chute"
      : `Analógico: mira · ${padButtonLabel(setPiecePad.family,"pass")} passe · ${padButtonLabel(setPiecePad.family,"shoot")} chute`
    : null;

  return (
    <main
      ref={rootRef}
      className={"football-shell quality-" + quality}
      data-camera={presentation.camera}
      data-lighting={presentation.lighting}
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
              <div className="score-team" style={{borderBottomColor:homeTeam.primary}}>
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
                <span>{specialMode==='training'?'TREINO LIVRE':`${hud.half}º TEMPO`}</span>
                <b>{specialMode==='training'?'∞':formatTime(hud.remaining)}</b>
              </div>
              <strong>{hud.awayScore}</strong>
              <div className="score-team score-team--away" style={{borderBottomColor:awayTeam.primary}}>
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

            <div className="broadcast-tag" aria-hidden="true"><i /> STADLER SPORTS <span>AO VIVO</span></div>
            {presentation.radar && <div className="match-radar" aria-label="Radar: seu time em verde, adversário em azul e bola branca">
              <canvas ref={radarRef} width={440} height={292} aria-hidden="true" />
              <div><span><i />{homeTeam.short}</span><span>{awayTeam.short}<i /></span></div>
            </div>}
            {!hud.setPieceKind && <div className="mobile-player-readout">{hud.playerNumber} · {hud.playerName}<span>OVR {hud.playerOverall}</span></div>}
            {hud.setPieceKind && specialMode!=='training' && (
              <div
                className="set-piece-hud"
                data-ready={hud.setPieceReady}
                role="status"
              >
                <span>{setPieceName(hud.setPieceKind)}</span>
                {setPieceControllerHint ? <strong>{setPieceControllerHint}</strong> : <><strong className="keyboard-set-piece">{setPieceInstruction(hud)}</strong>
                <strong className="touch-set-piece">{hud.setPieceSide === "away"
                  ? hud.gameMode === "local2p" ? "J2: use o teclado para cobrar" : "Adversário na cobrança"
                  : hud.setPieceReady ? "Analógico: mira • PASSE ou segure CHUTE" : "Aguarde para cobrar"}</strong></>}
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
                {passTargetName && <small className="pass-target">PASSE → {passTargetName}</small>}
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
            <p className="mobile-play-hint" role="status">{fullscreenHint || (hud.gameMode === "local2p" ? "J1 e J2: controles ou teclado • Toque: J1" : "Analógico: mira/corre • Segure passe: enfiada")}</p>
            <div className="touch-controls" data-editing={editingTouch} aria-label="Controles de toque"
              onClickCapture={e=>{if(editingTouch){e.preventDefault();e.stopPropagation();}}}
              onPointerDownCapture={e=>{if(!editingTouch)return;e.preventDefault();e.stopPropagation();const target=(e.target as HTMLElement).closest<HTMLElement>('[data-control]');if(target?.dataset.control){dragControlRef.current={id:e.pointerId,key:target.dataset.control};e.currentTarget.setPointerCapture(e.pointerId);}}}
              onPointerMoveCapture={editControlMove}
              onPointerUpCapture={e=>{if(!editingTouch)return;e.preventDefault();e.stopPropagation();dragControlRef.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
              onPointerCancelCapture={()=>{dragControlRef.current=null;}}
              onLostPointerCapture={()=>{dragControlRef.current=null;}} onContextMenu={event => event.preventDefault()}>
              <span className="touch-orientation-hint">Vire o celular para uma visão mais ampla</span>
              <div
                className="joystick" data-control="joystick" style={controlStyle("joystick")}
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
                className="touch-sprint" data-control="sprint" style={controlStyle("sprint")}
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
                  className="touch-button touch-button--tackle" data-control="tackle" style={controlStyle("tackle")}
                  onClick={() => actionsRef.current.steal()}
                  aria-label="Dar o bote e roubar a bola"
                >
                  BOTE
                  <small>roubar</small>
                </button>
                <button
                  type="button"
                  className="touch-button touch-button--switch" data-control="switch" style={controlStyle("switch")}
                  onClick={() => actionsRef.current.switchPlayer()}
                  aria-label="Trocar jogador selecionado"
                >
                  TROCAR
                  <small>jogador</small>
                </button>
                <button
                  type="button"
                  className="touch-button touch-button--slide" data-control="slide" style={controlStyle("slide")}
                  onClick={() => actionsRef.current.slide()}
                  aria-label="Dar carrinho"
                >
                  CARRINHO
                </button>
                <button
                  type="button"
                  className="touch-button touch-button--pass" data-control="pass" style={controlStyle("pass")}
                  onPointerDown={event => {
                    event.preventDefault();
                    if (passPointer.current) return;
                    passPointer.current={id:event.pointerId,started:performance.now()};
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerUp={event => {
                    const pointer=passPointer.current;if(pointer?.id!==event.pointerId)return;
                    passPointer.current=null;
                    actionsRef.current.pass("home",performance.now()-pointer.started>=320);
                    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
                  }}
                  onPointerCancel={() => { passPointer.current=null; }}
                  onLostPointerCapture={() => { passPointer.current=null; }}
                  onClick={event => { if(event.detail===0)actionsRef.current.pass(); }}
                  aria-label="Passar a bola; segure para enfiada"
                >
                  PASSE
                  <small>segure: enfiada</small>
                </button>
                <button
                  type="button"
                  className="touch-button touch-button--shoot" data-control="shoot" style={controlStyle("shoot")}
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

        {trainingStatus&&screen==='playing'&&<div className="training-overlay" data-ready={trainingStatus.ready} role="status"><span>TREINO · {trainingStatus.successes} acertos / {trainingStatus.attempts} tentativas</span><strong>{trainingStatus.text}</strong><button onClick={()=>{const state=engineRef.current;if(state){clearMatchInput(inputRef.current,state);resetTraining(state);replayRef.current.reset();setReplaying(false);}}}>Repetir tentativa</button></div>}
        {replaying&&<div className="replay-overlay" role="status"><b>REPLAY DO GOL · 0,5×</b><span>Câmera alternativa</span><button type="button" onClick={skipReplay}>Pular replay · Espaço / A / ✕</button></div>}
        {editingTouch&&<div className="touch-editor-toolbar"><strong>Arraste cada controle até a posição desejada</strong><button type="button" onClick={()=>saveControls({...controlsRef.current,layout:{}})}>Restaurar</button><button type="button" onClick={()=>{editingTouchRef.current=false;setEditingTouch(false);dragControlRef.current=null;clearMatchInput(inputRef.current,engineRef.current);setPaused(true);}}>Concluir</button></div>}
        {screen==='playing'&&!replaying&&!editingTouch&&<div className="touch-specials">
          <button type="button" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);inputRef.current.touchShield=true;}} onPointerUp={()=>{inputRef.current.touchShield=false;}} onPointerCancel={()=>{inputRef.current.touchShield=false;}} onLostPointerCapture={()=>{inputRef.current.touchShield=false;}}>Proteger</button>
          <button type="button" onClick={()=>actionsRef.current.skill('rainbow')}>Chapéu</button><button type="button" onClick={()=>actionsRef.current.skill('feint')}>Finta</button><button type="button" onClick={()=>actionsRef.current.skill('bicycle')}>Bicicleta</button>
          <details className="aerial-controls"><summary>Jogadas +</summary><div><button onClick={()=>actionsRef.current.skill('crossHigh')}>Cruz. alto · N</button><button onClick={()=>actionsRef.current.skill('crossLow')}>Rasteiro · M</button><button onClick={()=>actionsRef.current.skill('oneTwo')}>Tabelinha · Y</button><button onClick={()=>actionsRef.current.skill('header')}>Cabeceio</button><button onClick={()=>actionsRef.current.skill('volley')}>Voleio</button></div></details>
          <select aria-label="Tipo de chute no celular" value={controls.touchShot} onChange={e=>saveControls({...controlsRef.current,touchShot:e.target.value as ShotKind})}><option value="auto">Chute normal</option><option value="placed">Colocado</option><option value="lob">Cavadinha</option><option value="power">Superchute</option></select>
        </div>}
        {hud.message && screen === "playing" && specialMode!=='training' && (
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
                  <i /> MATCHDAY · BROADCAST
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
              <div className="new-mode-buttons"><button onClick={()=>setJourneyOpen(true)}><span>CARREIRA DE JOGADOR</span><small>{journey?`${journey.name} · continuar jornada`:'Crie seu craque e conquiste títulos'}</small></button><button onClick={()=>setTrainingOpen(true)}><span>CENTRO DE TREINO</span><small>Dribles, faltas, pênaltis e bicicletas</small></button></div>

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

              <button className="controller-strip" type="button" onClick={()=>toggleSettings(true)}>
                <Gamepad2 size={19}/><span>{padInfos.length?padInfos.map(p=>`J${p.side==="home"?1:2}: ${p.family==="generic"?"controle":p.family}`).join(" · "):"Xbox · PlayStation · Nintendo"}<small>{padInfos.length?"Ver botões e configurar controles":"USB ou Bluetooth · pressione um botão para ativar"}</small></span><ChevronRight size={16}/>
              </button>
              <div className="menu-actions">
                <button
                  type="button"
                  className="play-button"
                  disabled={
                    rendererStatus === "starting" || rendererStatus === "unavailable" || ((competitionMode === "league" ||
                      competitionMode === "career") &&
                    availableAwayTeams.length === 0)
                  }
                  onClick={startMatch}
                >
                  <Play fill="currentColor" size={21} />
                  {rendererStatus === "starting" ? "PREPARANDO ESTÁDIO" : rendererStatus === "unavailable" ? "GRÁFICOS INDISPONÍVEIS" : availableAwayTeams.length === 0
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
              {specialMode==='player'&&journey?.history[0]&&<p className="career-reward">Nota {journey.history[0].rating.toFixed(1)} · +{journey.history[0].xp} XP · {journey.points} pontos para evoluir</p>}
              <button className="secondary-button" onClick={openMatchCentre}>ANÁLISE COMPLETA E MAPA DE CALOR</button>
              {specialMode==='player'&&<button className="play-button" onClick={()=>{goToMenu();setJourneyOpen(true);}}>VOLTAR À MINHA CARREIRA</button>}
              <div className="finish-actions">
                {competitionMode === "friendly" && !specialMode && <button type="button" className="play-button" onClick={restart}>
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
              <small>{presentation.automatic ? "Ajuste automático ativo" : "Qualidade fixa"}</small>
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
          <div className="presentation-controls">
            <label><span><Camera size={17} /> Câmera da partida</span>
              <select aria-label="Câmera da partida" value={presentation.camera} onChange={e=>setPresentation(p=>({...p,camera:e.target.value as CameraMode}))}>
                <option value="broadcast">Transmissão · acompanha a jogada</option>
                <option value="tactical">Tática · visão do campo inteiro</option>
                <option value="close">Próxima · foco no lance</option>
              </select>
            </label>
            <label><span><Sun size={17} /> Iluminação do estádio</span>
              <select aria-label="Iluminação do estádio" value={presentation.lighting} onChange={e=>setPresentation(p=>({...p,lighting:e.target.value as StadiumLight}))}>
                <option value="night">Noite · refletores</option>
                <option value="day">Dia · luz natural</option>
              </select>
            </label>
            <p>{rendererStatus==="webgl"?"Renderização 3D ativa":"Renderização 2D compatível ativa"} · Preferências salvas neste navegador.</p>
          </div>
          <div className="presentation-switches">
            <label><span><strong>Ajuste automático de desempenho</strong><small>Reduz a resolução e os efeitos quando a partida perde fluidez.</small></span><Switch checked={presentation.automatic} onCheckedChange={automatic=>setPresentation(p=>({...p,automatic}))} aria-label="Ajuste automático de desempenho" /></label>
            <label><span><strong>Radar da partida</strong><small>Veja os companheiros, adversários e a bola no campo inteiro.</small></span><Switch checked={presentation.radar} onCheckedChange={radar=>setPresentation(p=>({...p,radar}))} aria-label="Mostrar radar da partida" /></label>
          </div>
          <AdvancedControls value={controls} onChange={saveControls} canEdit={screen==='playing'&&!replaying}
            onEdit={()=>{setSettingsOpen(false);editingTouchRef.current=true;setEditingTouch(true);setPaused(false);if(engineRef.current)engineRef.current.paused=true;clearMatchInput(inputRef.current,engineRef.current);gamepadDriverRef.current?.reset();}}/>
          <ControllerSettings infos={padInfos} profiles={padProfiles} calibration={calibration} notice={controllerNotice}
            onCalibrate={info=>{const next=beginPadCalibration(info);calibrationRef.current=next;setCalibration(next);gamepadDriverRef.current?.reset();setControllerNotice("");}}
            onCancel={()=>{calibrationRef.current=null;setCalibration(null);gamepadDriverRef.current?.reset();}}
            onReset={id=>{const next={...padProfilesRef.current};delete next[id];padProfilesRef.current=next;setPadProfiles(next);gamepadDriverRef.current?.reset();try{window.localStorage.setItem("stadler-controllers-v1",JSON.stringify(next));}catch{/* Session preference remains active. */}}}
          />
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
        open={paused && screen === "playing" && !matchCentre}
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
          {controllerNotice && <p className="controller-notice" role="status">{controllerNotice}</p>}
          {padInfos.some(p=>p.usable) && <div className="pause-controller-help">{padInfos.filter(p=>p.usable).map(p=><p key={p.index}><Gamepad2 size={16}/> J{p.side==="home"?1:2}: {p.custom?"Botões personalizados nas configurações":`${padButtonLabel(p.family,"pass")} passe · ${padButtonLabel(p.family,"shoot")} chute · ${padButtonLabel(p.family,"sprint")} correr · ${padButtonLabel(p.family,"pause")} continuar`}</p>)}</div>}
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
                <kbd>F</kbd> passe · Shift + F: enfiada
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
                  <kbd>K</kbd> passe · Enter + K: enfiada
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
          <button type="button" className="secondary-button" onClick={openMatchCentre}>TÁTICAS, SUBSTITUIÇÕES E ESTATÍSTICAS</button>
          <p className="hub-note">N: cruzamento alto · M: rasteiro · Y: tabelinha · Chute com a bola no ar: cabeceio / voleio.</p>
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
      <CareerHub open={journeyOpen} onOpenChange={setJourneyOpen} career={journey} onSave={saveJourney} onPlay={launchCareerMatch} saveFailed={journeySaveFailed}/>
      <TrainingHub open={trainingOpen} onOpenChange={setTrainingOpen} onPlay={launchTraining}/>
      {matchCentre&&<MatchCentre state={matchCentre} onClose={()=>setMatchCentre(null)} onTactics={(side,tactic,pressure,width)=>{const state=engineRef.current;if(state&&setLiveTactics(state,side,tactic,pressure,width))setMatchCentre(structuredClone(state));}} onSub={(side,id,index)=>{const state=engineRef.current;if(!state)return false;const changed=substitutePlayer(state,side,id,index);setMatchCentre(structuredClone(state));return changed;}}/>}
    </main>
  );
}
