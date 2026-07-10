import React, { useState, useEffect, useCallback } from "react";

const COLS = 10;
const ROWS = 20;

// 블럭 모양
const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
};

const randomShape = () => {
  const keys = Object.keys(SHAPES);
  const shape = SHAPES[keys[(keys.length * Math.random()) | 0]];
  return { shape };
};

// 회전 (제자리 회전)
function rotate(matrix) {
  const N = matrix.length;
  const result = Array.from({ length: N }, () => Array(N).fill(0));
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      result[x][N - 1 - y] = matrix[y][x];
    }
  }
  return result;
}

export default function Tetris() {
  const [board, setBoard] = useState(
    Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  );
  const [currentPiece, setCurrentPiece] = useState(randomShape());
  const [x, setX] = useState(3);
  const [y, setY] = useState(0);
  const [score, setScore] = useState(0);
  const [clearedLines, setClearedLines] = useState(0);
  const [level, setLevel] = useState(1);

  const checkCollision = (shape, offsetX, offsetY) => {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newX = col + offsetX;
          const newY = row + offsetY;
          if (
            newX < 0 ||
            newX >= COLS ||
            newY >= ROWS ||
            (newY >= 0 && board[newY][newX])
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const mergePiece = useCallback(() => {
    const newBoard = board.map((row) => [...row]);
    currentPiece.shape.forEach((row, dy) => {
      row.forEach((value, dx) => {
        if (value) {
          newBoard[y + dy][x + dx] = value;
        }
      });
    });
    return newBoard;
  }, [board, currentPiece, x, y]);

  const clearLines = useCallback(
    (newBoard) => {
      let lines = 0;
      for (let row = ROWS - 1; row >= 0; row--) {
        if (newBoard[row].every((cell) => cell !== 0)) {
          newBoard.splice(row, 1);
          newBoard.unshift(Array(COLS).fill(0));
          lines++;
          row++;
        }
      }
      if (lines > 0) {
        setScore((s) => s + lines * 100);
        setClearedLines((c) => c + lines);

        // 레벨업 조건 (30줄 + 5씩 증가)
        const target = 30 + (level - 1) * 5;
        if (clearedLines + lines >= target) {
          setLevel((lvl) => lvl + 1);
          setClearedLines(0);
        }
      }
      return newBoard;
    },
    [clearedLines, level]
  );

  const newPiece = useCallback(() => {
    setCurrentPiece(randomShape());
    setX(3);
    setY(0);
  }, []);

  const moveDown = useCallback(() => {
    if (!checkCollision(currentPiece.shape, x, y + 1)) {
      setY((y) => y + 1);
    } else {
      let newBoard = mergePiece();
      newBoard = clearLines(newBoard);
      setBoard(newBoard);
      newPiece();
    }
  }, [checkCollision, currentPiece, x, y, mergePiece, clearLines, newPiece]);

  const moveLeft = () => {
    if (!checkCollision(currentPiece.shape, x - 1, y)) {
      setX((x) => x - 1);
    }
  };

  const moveRight = () => {
    if (!checkCollision(currentPiece.shape, x + 1, y)) {
      setX((x) => x + 1);
    }
  };

  const handleRotate = () => {
    const rotated = rotate(currentPiece.shape);
    if (!checkCollision(rotated, x, y)) {
      setCurrentPiece({ ...currentPiece, shape: rotated });
      moveDown(); // 회전 후에도 내려오기 적용
    }
  };

  useEffect(() => {
    const interval = setInterval(moveDown, 1000 - level * 100);
    return () => clearInterval(interval);
  }, [moveDown, level]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") moveLeft();
      if (e.key === "ArrowRight") moveRight();
      if (e.key === "ArrowDown") moveDown();
      if (e.key === "ArrowUp") handleRotate();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRotate, moveDown]);

  return (
    <div className="flex flex-col items-center p-4">
      <h1 className="text-2xl font-bold">테트리스</h1>
      <p>점수: {score} | 레벨: {level}</p>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 20px)`,
          gridTemplateRows: `repeat(${ROWS}, 20px)`,
          gap: "1px",
          background: "#333",
        }}
      >
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            let isCurrent =
              y <= rowIndex &&
              rowIndex < y + currentPiece.shape.length &&
              x <= colIndex &&
              colIndex < x + currentPiece.shape[0].length &&
              currentPiece.shape[rowIndex - y]?.[colIndex - x];
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                style={{
                  width: 20,
                  height: 20,
                  background: isCurrent
                    ? "cyan"
                    : cell
                    ? "blue"
                    : "black",
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
