import { useEffect, useState } from "react";
import "./App.css";

const STORAGE_KEY = "image-bingo-v2";

// ✅ Put ONLY 24 prompts here (NO "FREE" inside)
const DEFAULT_PROMPTS_24 = [
  "Blue Sandals", "Wet Beach Blanket", "Windblown Hair", "Green Snorkel", "Flip-Flops",
  "Seashells", "Neon Bikini", "Striped Towel", "Sunburned Shoulders", "Shell Anklet",
  "Colorful Umbrella", "Sandy Feet", "Patterned Beach Bag", "Hat Flying Away", "White Coverup",
  "Polka-dot Swimsuit", "Beachball", "Polished Nail", "Purple Hair", "Cooler",
  "Floral Shorts", "Sunglasses", "Sand Toys", "Sand Castle", "Happy Faces"
];

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const buildInitialBoard = () => {
  const b = Array(25).fill(null);
  b[12] = "FREE";
  return b;
};

const buildRandomPrompts25 = () => {
  const shuffled24 = shuffle(DEFAULT_PROMPTS_24);
  const p = [];
  let k = 0;
  for (let i = 0; i < 25; i++) {
    if (i === 12) p.push("FREE");
    else p.push(shuffled24[k++]);
  }
  return p;
};

export default function App() {
  // ✅ Initialize prompts immediately so they show on first render
  const [prompts, setPrompts] = useState(() => buildRandomPrompts25());

  const [board, setBoard] = useState(buildInitialBoard);
  const [marked, setMarked] = useState(Array(25).fill(false));
  const [preview, setPreview] = useState({ open: false, src: "", label: "" });

  // ✅ Load saved state (board/marked/prompts) from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // first run -> persist initial randomized prompts + empty board
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ board: buildInitialBoard(), marked: Array(25).fill(false), prompts })
        );
        return;
      }

      const saved = JSON.parse(raw);

      if (Array.isArray(saved.board) && saved.board.length === 25) setBoard(saved.board);
      if (Array.isArray(saved.marked) && saved.marked.length === 25) setMarked(saved.marked);

      // Backward compatible: if prompts missing, generate and save
      if (Array.isArray(saved.prompts) && saved.prompts.length === 25) {
        setPrompts(saved.prompts);
      } else {
        const fresh = buildRandomPrompts25();
        setPrompts(fresh);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            board: saved.board?.length === 25 ? saved.board : buildInitialBoard(),
            marked: saved.marked?.length === 25 ? saved.marked : Array(25).fill(false),
            prompts: fresh,
          })
        );
      }
    } catch (e) {
      console.warn("Failed to load bingo state:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Save whenever board/marked/prompts changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ board, marked, prompts }));
    } catch (e) {
      console.warn("Failed to save bingo state:", e);
    }
  }, [board, marked, prompts]);

  const toggleMark = (index) => {
    if (board[index] === "FREE") return;
    setMarked((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  // ✅ Auto-mark when image uploaded
  const handleImage = (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setBoard((prev) => {
        const next = [...prev];
        next[index] = reader.result;
        return next;
      });

      setMarked((prev) => {
        const next = [...prev];
        next[index] = true;
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  const checkBingo = () => {
    const lines = [
      [0, 1, 2, 3, 4],
      [5, 6, 7, 8, 9],
      [10, 11, 12, 13, 14],
      [15, 16, 17, 18, 19],
      [20, 21, 22, 23, 24],
      [0, 5, 10, 15, 20],
      [1, 6, 11, 16, 21],
      [2, 7, 12, 17, 22],
      [3, 8, 13, 18, 23],
      [4, 9, 14, 19, 24],
      [0, 6, 12, 18, 24],
      [4, 8, 12, 16, 20],
    ];
    return lines.some((line) => line.every((i) => marked[i] || board[i] === "FREE"));
  };

  const bingo = checkBingo();

  const resetBoardRandom = () => {
    const newPrompts = buildRandomPrompts25();
    const newBoard = buildInitialBoard();
    const newMarked = Array(25).fill(false);

    setPrompts(newPrompts);
    setBoard(newBoard);
    setMarked(newMarked);
    setPreview({ open: false, src: "", label: "" });

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ board: newBoard, marked: newMarked, prompts: newPrompts })
    );
  };

  return (
    <div className="page">
      <h1>🏖️ Bingo 🏖️</h1>

      <div className="board">
        {board.map((tile, i) => {
          const isFree = tile === "FREE";
          const hasImage = typeof tile === "string" && tile.startsWith("data:");

          const onCellClick = () => {
            if (isFree) return;
            if (hasImage) {
              setPreview({ open: true, src: tile, label: prompts[i] || `Tile ${i}` });
              return;
            }
            toggleMark(i);
          };

          return (
            <div
              key={i}
              className={`cell ${marked[i] ? "marked" : ""}`}
              onClick={onCellClick}
              role="button"
              tabIndex={0}
            >
              {isFree ? (
                <span className="free">FREE <br></br> 🏖️🌊</span>
              ) : hasImage ? (
                <img src={tile} alt={prompts[i] || `Tile ${i}`} />
              ) : (
                <div className="prompt">{prompts[i] || "Upload an image"}</div>
              )}

              {!isFree && (
              <div className="uploadActions" onClick={(e) => e.stopPropagation()}>
                {/* Camera */}
                <label className="uploadBtn camera">
                  📷
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    hidden
                    onChange={(e) => handleImage(e, i)}
                  />
                </label>

                {/* Gallery */}
                <label className="uploadBtn gallery">
                  🖼️
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => handleImage(e, i)}
                  />
                </label>
              </div>
            )}
            </div>
          );
        })}
      </div>

      {bingo && <div className="bingo">🎉 BEACH BINGO! 🏖️</div>}

      <div className="help">
        • Upload an image per tile 📸 (auto-marks green)<br />
        • Click a tile with an image to preview it 🖼️<br />
        • Center tile is FREE<br />
        <button className="reset" onClick={resetBoardRandom}>
          Reset (New Random Prompts)
        </button>
      </div>

      {preview.open && (
        <div className="modalOverlay" onClick={() => setPreview({ open: false, src: "", label: "" })}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <button className="modalClose" onClick={() => setPreview({ open: false, src: "", label: "" })}>
              ✕
            </button>
            <div className="modalTitle">{preview.label}</div>
            <img className="modalImg" src={preview.src} alt={preview.label} />
          </div>
        </div>
      )}
    </div>
  );
}