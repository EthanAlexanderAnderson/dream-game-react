import React, { useEffect, useState } from "react";

const sortOptions = [
    ["random", "Random"],
    ["newest", "Newest"],
    ["oldest", "Oldest"],
    ["shortest", "Shortest"],
    ["longest", "Longest"],
    ["easiest", "Easiest"],
    ["hardest", "Hardest"]
];

const bonusLabels = {
    underdog: "Underdog",
    streak: "Streak",
    bottomFeeder: "Bottom Feeder",
    earlyBird: "Early Bird",
    irony: "Irony",
    loneWolf: "Lone Wolf",
    nonConformist: "Non-conformist",
    mixedBag: "Mixed Bag"
};

function RangeFilter({ label, range, minimum, maximum, step = 1, onChange }) {
    const update = (index, value) => {
        const next = [...range];
        next[index] = Number(value);
        onChange(next);
    };
    const span = Math.max(1, maximum - minimum);
    const start = `${((range[0] - minimum) / span) * 100}%`;
    const end = `${((range[1] - minimum) / span) * 100}%`;

    return (
        <div className="settingsRange">
            <div className="settingsRangeHeader">
                <span>{label}</span>
                <span>{range[0]} - {range[1]}</span>
            </div>
            <div className="rangeInputs">
                <div className="rangeTrack" aria-hidden="true">
                    <div className="rangeSelected" style={{ left: start, right: `calc(100% - ${end})` }} />
                </div>
                <input type="range" min={minimum} max={maximum} step={step} value={range[0]} onChange={(event) => update(0, event.target.value)} aria-label={`${label} minimum`} />
                <input type="range" min={minimum} max={maximum} step={step} value={range[1]} onChange={(event) => update(1, event.target.value)} aria-label={`${label} maximum`} />
            </div>
        </div>
    );
}

function GameSettings({ settings, open, onToggle, canEdit, onDirtyChange, onSave }) {
    const [draft, setDraft] = useState(settings);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        if (settings) {
            setDraft(settings);
            setDirty(false);
            onDirtyChange(false);
        }
    }, [settings, onDirtyChange]);

    if (!settings || !draft) {
        return null;
    }

    const editable = canEdit === true;
    const limits = settings.limits || { dreamCount: 1, maxDreamLength: 1, difficulty: [-5, 15], names: [] };

    const update = (changes) => {
        setDraft((previous) => ({ ...previous, ...changes }));
        setDirty(true);
        onDirtyChange(true);
    };

    const save = () => {
        if (editable && dirty) {
            onSave(draft);
        } else {
            onToggle();
        }
    };

    return (
        <div className="gameSettings">
            <button className={`btn btn-primary settingsToggle${dirty && editable ? " settingsDirty" : ""}`} type="button" onClick={open && dirty && editable ? save : onToggle}>
                {open ? (dirty && editable ? "Save Game Settings" : "Hide Game Settings") : "Game Settings"}
            </button>
            {open && (
                <div className="settingsMenu">
                    <div className="settingsReadOnly">{editable ? "You can edit these settings until you click Ready." : "Game settings are view-only for ready players and after the game starts."}</div>

                    <fieldset disabled={!editable}>
                        <legend>Sort</legend>
                        <div className="settingsOptions">
                            {sortOptions.map(([value, label]) => (
                                <label key={value}>
                                    <input type="radio" name="dreamSort" checked={draft.sort === value} onChange={() => update({ sort: value })} />
                                    {label}
                                </label>
                            ))}
                        </div>

                        <legend>Filter</legend>
                        <RangeFilter label="Dream number" range={draft.numberRange} minimum={0} maximum={Math.max(0, limits.dreamCount - 1)} onChange={(numberRange) => update({ numberRange })} />
                        <RangeFilter label="Difficulty" range={draft.difficultyRange} minimum={limits.difficulty[0]} maximum={limits.difficulty[1]} onChange={(difficultyRange) => update({ difficultyRange })} />
                        <RangeFilter label="Length" range={draft.lengthRange} minimum={0} maximum={Math.max(1, limits.maxDreamLength)} onChange={(lengthRange) => update({ lengthRange })} />
                        <div className="settingsNames">
                            <legend>Dreamers</legend>
                            <div>
                                {limits.names.map((playerName) => {
                                    const enabled = draft.allowedDreamers.includes(playerName);
                                    return (
                                        <button key={playerName} type="button" className={`btn ${enabled ? "btn-primary" : "btn-outline-secondary"}`} onClick={() => {
                                            const allowedDreamers = enabled
                                                ? draft.allowedDreamers.filter((name) => name !== playerName)
                                                : [...draft.allowedDreamers, playerName];
                                            update({ allowedDreamers });
                                        }}>{playerName}</button>
                                    );
                                })}
                            </div>
                        </div>

                        <legend>Settings</legend>
                        <label className="settingsCheck">
                            <input type="checkbox" checked={draft.bonusPoints} onChange={(event) => update({ bonusPoints: event.target.checked })} />
                            Enable bonus points
                        </label>
                        {draft.bonusPoints && (
                            <details className="settingsSubOptions">
                                <summary>Bonus types</summary>
                                {Object.entries(bonusLabels).map(([key, label]) => (
                                    <label key={key} className="settingsCheck">
                                        <input type="checkbox" checked={draft.bonuses[key]} onChange={(event) => update({ bonuses: { ...draft.bonuses, [key]: event.target.checked } })} />
                                        {label}
                                    </label>
                                ))}
                            </details>
                        )}
                        <label className="settingsCheck">
                            <input type="checkbox" checked={draft.hintsEnabled} onChange={(event) => update({ hintsEnabled: event.target.checked })} />
                            Enable hints
                        </label>
                        {draft.hintsEnabled && (
                            <label className="settingsSingleRange">
                                Maximum hints: {draft.maxHints}
                                <input type="range" min="1" max="12" value={draft.maxHints} onChange={(event) => update({ maxHints: Number(event.target.value) })} />
                            </label>
                        )}
                        <label className="settingsCheck">
                            <input type="checkbox" checked={draft.gnomeEnabled} onChange={(event) => update({ gnomeEnabled: event.target.checked })} />
                            Enable gnome mode
                        </label>
                        {draft.gnomeEnabled && (
                            <label className="settingsSingleRange">
                                Gnome frequency: {draft.gnomeFrequency}%
                                <input type="range" min="1" max="100" value={draft.gnomeFrequency} onChange={(event) => update({ gnomeFrequency: Number(event.target.value) })} />
                            </label>
                        )}
                    </fieldset>
                </div>
            )}
        </div>
    );
}

export default GameSettings;
