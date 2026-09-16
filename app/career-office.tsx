"use client";
import {
  ensureManagement,
  negotiateTransfer,
  nextCareerSeason,
  playerKey,
  promoteYouth,
  renewContract,
  selectCareerStarter,
  sellCareerPlayer,
  transferValue,
  wageBill,
  weeklyWage,
} from "@/lib/football-career";
import { TEAMS, type CareerState, type SquadSeed } from "@/lib/football-engine";
import { useMemo, useState } from "react";

const roles = { GK: "GOL", DF: "DEF", MF: "MEI", FW: "ATA" };
export default function CareerOffice({
  career,
  onChange,
  onNewSeason,
}: {
  career: CareerState;
  onChange: (next: CareerState) => void;
  onNewSeason: () => void;
}) {
  const current = useMemo(() => ensureManagement(career), [career]),
    m = current.management;
  const [tab, setTab] = useState("squad"),
    [query, setQuery] = useState(""),
    [message, setMessage] = useState("");
  const [negotiation, setNegotiation] = useState<{
    seller: string;
    seed: SquadSeed;
  } | null>(null);
  const [fee, setFee] = useState(0),
    [wage, setWage] = useState(0),
    [years, setYears] = useState(3);
  const market = useMemo(
    () =>
      Object.entries(m.worldSquads)
        .flatMap(([seller, seeds]) => seeds.map((seed) => ({ seller, seed })))
        .filter(
          (e) =>
            !query ||
            `${e.seed[0]} ${TEAMS.find((t) => t.id === e.seller)?.name}`
              .toLocaleLowerCase("pt-BR")
              .includes(query.toLocaleLowerCase("pt-BR")),
        )
        .sort((a, b) => b.seed[2] - a.seed[2])
        .slice(0, 60),
    [m.worldSquads, query],
  );
  const club = TEAMS.find((t) => t.id === career.clubId)!;
  const rounds =
    (TEAMS.filter((t) => t.leagueId === club.leagueId).length - 1) * 2;
  return (
    <div className="career-office">
      <div className="office-summary">
        <span>
          Orçamento<b>€{career.budget.toFixed(2)} mi</b>
        </span>
        <span>
          Folha semanal<b>€{wageBill(current).toLocaleString("pt-BR")} mil</b>
        </span>
        <span>
          Diretoria<b>{Math.round(m.confidence)}% de confiança</b>
        </span>
        <span>
          Temporada {career.season}
          <b>
            Rodada {m.week}/{rounds}
          </b>
        </span>
      </div>
      <nav className="office-tabs" aria-label="Gestão do clube">
        {[
          ["squad", "Elenco"],
          ["market", "Negociações"],
          ["academy", "Categorias de base"],
          ["board", "Diretoria"],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            data-active={tab === id}
            onClick={() => {
              setTab(id);
              setMessage("");
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {message && (
        <p className="office-feedback" role="status">
          {message}
        </p>
      )}
      {m.status === "sacked" && (
        <p className="office-feedback">
          A diretoria encerrou seu contrato. Escolha outro clube para iniciar
          uma nova carreira.
        </p>
      )}
      {tab === "squad" && (
        <>
          <div className="office-toolbar">
            <p>
              Escalação, condição física e contratos. A moral e o cansaço afetam
              o OVR em campo.
            </p>
            <label>
              Treinamento
              <select
                value={m.training}
                onChange={(e) =>
                  onChange({
                    ...current,
                    management: {
                      ...m,
                      training: e.target.value as typeof m.training,
                    },
                  })
                }
              >
                <option value="balanced">Equilibrado</option>
                <option value="fitness">Recuperação física</option>
                <option value="development">Desenvolvimento</option>
              </select>
            </label>
          </div>
          <div className="office-table-wrap">
            <table className="office-table">
              <thead>
                <tr>
                  <th>Jogador</th>
                  <th>OVR / POT</th>
                  <th>Condição</th>
                  <th>Moral</th>
                  <th>Contrato</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {[...career.squad]
                  .sort(
                    (a, b) =>
                      Number(m.starters.includes(playerKey(b))) -
                        Number(m.starters.includes(playerKey(a))) ||
                      b[2] - a[2],
                  )
                  .map((seed) => {
                    const key = playerKey(seed),
                      c = m.contracts[key],
                      starter = m.starters.includes(key);
                    if (!c) return null;
                    return (
                      <tr key={key} data-starter={starter}>
                        <td>
                          <strong>{seed[0]}</strong>
                          <small>
                            {roles[seed[3] ?? "MF"]} · {c.age} anos ·{" "}
                            {starter ? "Titular" : "Reserva"}
                          </small>
                        </td>
                        <td>
                          <b>{seed[2]}</b> / {c.potential}
                        </td>
                        <td>
                          <meter min={0} max={100} value={100 - c.fatigue} />
                          <small>{Math.round(100 - c.fatigue)}%</small>
                        </td>
                        <td>{Math.round(c.morale)}%</td>
                        <td>
                          {c.years} ano(s)<small>€{c.wage} mil/sem</small>
                        </td>
                        <td className="office-row-actions">
                          <button
                            type="button"
                            disabled={starter || m.status !== "active"}
                            onClick={() =>
                              onChange(selectCareerStarter(current, key))
                            }
                          >
                            {starter ? "Escalado" : "Escalar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = renewContract(current, key);
                              onChange(next);
                              setMessage(
                                next === current
                                  ? "Não há margem de orçamento ou salários para renovar."
                                  : `Contrato de ${seed[0]} renovado por 3 anos.`,
                              );
                            }}
                          >
                            Renovar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const result = sellCareerPlayer(current, key);
                              onChange(result.career);
                              setMessage(result.message);
                            }}
                          >
                            Vender · €
                            {Math.round(transferValue(seed, m.week) * 0.88)} mi
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tab === "market" && (
        <>
          <div className="office-toolbar">
            <p>
              Negocie o passe, o salário semanal e a duração. Luvas: quatro
              semanas de salário.
            </p>
            <input
              aria-label="Buscar jogador ou clube"
              placeholder="Buscar jogador ou clube…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {negotiation && (
            <form
              className="negotiation-panel"
              onSubmit={(e) => {
                e.preventDefault();
                const result = negotiateTransfer(current, {
                  sellerId: negotiation.seller,
                  playerId: playerKey(negotiation.seed),
                  fee,
                  wage,
                  years,
                });
                onChange(result.career);
                setMessage(result.message);
                if (result.accepted) setNegotiation(null);
              }}
            >
              <strong>Proposta por {negotiation.seed[0]}</strong>
              <label>
                Passe (€ milhões)
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  required
                  value={fee}
                  onChange={(e) => setFee(Number(e.target.value))}
                />
              </label>
              <label>
                Salário (€ mil/sem)
                <input
                  type="number"
                  min={1}
                  required
                  value={wage}
                  onChange={(e) => setWage(Number(e.target.value))}
                />
              </label>
              <label>
                Contrato
                <select
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((y) => (
                    <option key={y} value={y}>
                      {y} ano(s)
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="office-primary">
                Enviar proposta
              </button>
              <button type="button" onClick={() => setNegotiation(null)}>
                Cancelar
              </button>
            </form>
          )}
          <div className="office-table-wrap">
            <table className="office-table">
              <thead>
                <tr>
                  <th>Jogador / clube</th>
                  <th>Idade</th>
                  <th>OVR / POT</th>
                  <th>Valor estimado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {market.map(({ seller, seed }) => (
                  <tr key={playerKey(seed)}>
                    <td>
                      <strong>{seed[0]}</strong>
                      <small>
                        {roles[seed[3] ?? "MF"]} ·{" "}
                        {TEAMS.find((t) => t.id === seller)?.name}
                      </small>
                    </td>
                    <td>{seed[4] ?? 24}</td>
                    <td>
                      {seed[2]} / {seed[5] ?? seed[2]}
                    </td>
                    <td>€{transferValue(seed, m.week)} mi</td>
                    <td>
                      <button
                        type="button"
                        disabled={m.status !== "active"}
                        onClick={() => {
                          setNegotiation({ seller, seed });
                          setFee(transferValue(seed, m.week));
                          setWage(weeklyWage(seed[2]));
                          setYears(3);
                          setMessage("");
                        }}
                      >
                        Negociar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {market.length === 0 && <p>Nenhum jogador encontrado.</p>}
          </div>
          <small>
            Exibindo até 60 resultados. Os valores e avaliações são próprios
            desta simulação.
          </small>
        </>
      )}
      {tab === "academy" && (
        <>
          <p>
            Talentos fictícios gerados para esta carreira. A promoção conta para
            o objetivo da diretoria; a evolução depende de treino e
            participação.
          </p>
          <div className="academy-grid">
            {m.academy.map((seed) => (
              <article key={playerKey(seed)}>
                <span>BASE · {roles[seed[3] ?? "MF"]}</span>
                <h3>{seed[0]}</h3>
                <p>{seed[4]} anos</p>
                <div>
                  <b>{seed[2]}</b> OVR <b>{seed[5]}</b> potencial
                </div>
                <button
                  type="button"
                  disabled={m.status !== "active"}
                  onClick={() => {
                    const next = promoteYouth(current, playerKey(seed));
                    onChange(next);
                    setMessage(
                      next === current
                        ? "Confira o limite salarial e o tamanho do elenco."
                        : `${seed[0]} está no elenco profissional.`,
                    );
                  }}
                >
                  Promover ao profissional
                </button>
              </article>
            ))}
          </div>
          {!m.academy.length && (
            <p>Novos talentos chegam na próxima temporada.</p>
          )}
        </>
      )}
      {tab === "board" && (
        <>
          <div className="board-objectives">
            <article>
              <span>Objetivo esportivo</span>
              <strong>
                {m.points} / {m.targetPoints} pontos
              </strong>
              <progress max={m.targetPoints} value={m.points} />
            </article>
            <article>
              <span>Formação de talentos</span>
              <strong>
                {m.promoted} / {m.youthTarget} promovidos
              </strong>
              <progress max={m.youthTarget} value={m.promoted} />
            </article>
            <article>
              <span>Limite de salários</span>
              <strong>€{m.wageLimit.toLocaleString("pt-BR")} mil/sem</strong>
              <progress max={m.wageLimit} value={wageBill(current)} />
            </article>
          </div>
          <p>
            Resultados ruins e dívidas reduzem a confiança. Confiança muito
            baixa pode levar à demissão. Renove contratos antes da virada da
            temporada.
          </p>
          <button
            type="button"
            className="office-primary"
            disabled={m.week < rounds || m.status !== "active"}
            onClick={() => {
              const next = nextCareerSeason(current);
              onChange(next);
              if (next.season !== current.season) onNewSeason();
            }}
          >
            Iniciar próxima temporada
          </button>
          <h3>Central de notícias</h3>
          <ul className="office-news">
            {m.news.map((news, i) => (
              <li key={`${i}-${news}`}>{news}</li>
            ))}
          </ul>
          <h3>Suas transferências</h3>
          <ul className="office-news">
            {career.transactions.map((news, i) => (
              <li key={`${i}-${news}`}>{news}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
