import type { Cell } from '../../types/project';
import LZString from 'lz-string';

import { SquareType, WallType } from '../../utils/helpers';

export class Layout {
  readonly width: number;
  readonly height: number;
  layout: Array<Array<WallType | SquareType>>;
  elements: Array<SquareType> = [];

  constructor(
    height: number,
    width: number,
    fromLayout?: Array<Array<WallType | SquareType>>,
  ) {
    this.height = height;
    this.width = width;

    const layout = Array.from(Array(height * 2 - 1), () =>
      Array(width * 2 - 1),
    );

    for (let i = 0; i < height * 2 - 1; i++) {
      for (let j = 0; j < width * 2 - 1; j++) {
        if (fromLayout !== undefined) {
          layout[i][j] = fromLayout[i][j];
          if (
            fromLayout[i][j] instanceof SquareType &&
            fromLayout[i][j] !== SquareType.Empty
          ) {
            const square = fromLayout[i][j] as SquareType;
            this.elements.push(square);
          }
        } else {
          if (i % 2 === 0 && j % 2 === 0) {
            layout[i][j] = SquareType.Empty;
          } else {
            layout[i][j] = WallType.Empty;
          }
        }
      }
    }
    this.layout = layout;
  }

  getElement(cell?: Cell): WallType | SquareType | undefined {
    if (cell === undefined) {
      return;
    }
    return this.layout[cell[0]][cell[1]];
  }

  setElement(cell: Cell, element: WallType | SquareType) {
    const [i, j] = cell;

    if (i % 2 === 0 && j % 2 === 0 && element instanceof WallType) {
      throw new TypeError('Cannot set a wall type on a square');
    } else if ((i % 2 !== 0 || j % 2 !== 0) && element instanceof SquareType) {
      throw new TypeError('Cannot set a square type on a wall');
    }

    this.layout[i][j] = element;

    if (element instanceof SquareType && element !== SquareType.Empty) {
      this.elements.push(element);
    }
  }

  swapElements(cell1: Cell, cell2: Cell) {
    const [i1, j1] = cell1;
    const [i2, j2] = cell2;
    if (i1 % 2 !== 0 || j1 % 2 !== 0 || i2 % 2 !== 0 || j2 % 2 !== 0) {
      throw new Error('Cannot swap wall elements');
    }
    const temp = this.layout[i1][j1];
    this.layout[i1][j1] = this.layout[i2][j2];
    this.layout[i2][j2] = temp;
  }

  fixCornerWalls() {
    for (let i = 0; i < this.height * 2 - 1; i++) {
      for (let j = 0; j < this.width * 2 - 1; j++) {
        if (i % 2 !== 0 && j % 2 !== 0) {
          let cornerWallType: WallType;
          const surroundingWallTypes = [
            this.layout[i][j - 1],
            this.layout[i][j + 1],
            this.layout[i - 1][j],
            this.layout[i + 1][j],
          ];

          if (
            surroundingWallTypes.filter((x) => x === WallType.Empty).length >= 3
          ) {
            cornerWallType = WallType.Empty;
          } else if (
            surroundingWallTypes.filter((x) => x === WallType.Wall).length > 1
          ) {
            cornerWallType = WallType.Wall;
          } else if (
            surroundingWallTypes.filter((x) => x === WallType.Half).length > 1
          ) {
            cornerWallType = WallType.Half;
          } else {
            cornerWallType = WallType.Wall;
          }

          this.layout[i][j] = cornerWallType;
        }
      }
    }
  }

  rotateElementLeft(cell: Cell) {
    const [i, j] = cell;
    if (this.layout[i][j] instanceof SquareType) {
      const square = this.layout[i][j] as SquareType;
      square.rotateLeft();
    } else {
      throw new Error('Cannot rotate a wall element');
    }
  }

  rotateElementRight(cell: Cell) {
    const [i, j] = cell;
    if (this.layout[i][j] instanceof SquareType) {
      const square = this.layout[i][j] as SquareType;
      square.rotateRight();
    } else {
      throw new Error('Cannot rotate a wall element');
    }
  }

  clone() {
    const newLayout = new Layout(this.height, this.width, this.layout);
    return newLayout;
  }

  removeWalls() {
    for (let i = 0; i < this.height * 2 - 1; i++) {
      for (let j = 0; j < this.width * 2 - 1; j++) {
        if ((i % 2 !== 0) !== (j % 2 !== 0)) {
          this.setElement([i, j], WallType.Empty);
        }
      }
    }
  }

  removeSquares() {
    for (let i = 0; i < this.height * 2 - 1; i++) {
      for (let j = 0; j < this.width * 2 - 1; j++) {
        if (i % 2 === 0 && j % 2 === 0) {
          this.setElement([i, j], SquareType.Empty);
        }
      }
    }
    this.elements = [];
  }

  // Duplicate element in the selected cell
  // It will either be placed in the hoveredCell, if it is not a wall and not already occupied
  // Or it will be placed in the first empty cell
  duplicateElement(selectedCell: Cell, hoveredCell?: Cell) {
    if (
      !(this.layout[selectedCell[0]][selectedCell[1]] instanceof SquareType)
    ) {
      throw new Error('Cannot duplicate a wall element');
    }

    const square = this.layout[selectedCell[0]][selectedCell[1]] as SquareType;

    if (hoveredCell && this.isEmptySquare(hoveredCell)) {
      this.setElement(hoveredCell, square.clone());
    } else {
      for (let i = 0; i < this.height * 2 - 1; i++) {
        for (let j = 0; j < this.width * 2 - 1; j++) {
          if (this.isEmptySquare([i, j])) {
            this.setElement([i, j], square.clone());
            return;
          }
        }
      }
    }
  }

  isEmptySquare(cell: Cell): boolean {
    const [i, j] = cell;
    const square = this.layout[i][j] as SquareType;
    return square && square === SquareType.Empty;
  }
}

export function encodeLayoutString(layout: Layout) {
  let layoutString = `v1 ${layout.height}x${layout.width} `;
  for (let i = 0; i < layout.height * 2 - 1; i++) {
    for (let j = 0; j < layout.width * 2 - 1; j++) {
      if (i % 2 === 0 || j % 2 === 0) {
        // Skip corner walls
        layoutString += layout.layout[i][j].getStrRepr();
      }
    }
  }
  return LZString.compressToEncodedURIComponent(layoutString);
}

export function decodeLayoutString(compressedLayoutString: string) {
  const decompressed = LZString.decompressFromEncodedURIComponent(
    compressedLayoutString,
  );
  if (decompressed === null) {
    throw new URIError('Invalid layout string, decompression failed');
  }

  // eslint-disable-next-line prefer-const
  let [version, size, layoutString] = decompressed.split(' ');
  if (version !== 'v1') {
    throw new URIError('Invalid layout string version');
  }
  const [height, width] = size.split('x').map((x) => parseInt(x));

  const layout = new Layout(height, width);
  for (let i = 0; i < layout.height * 2 - 1; i++) {
    for (let j = 0; j < layout.width * 2 - 1; j++) {
      // Squares (2 characters + 1 for rotation)
      if (i % 2 === 0 && j % 2 === 0) {
        const squareStrRepr = layoutString.slice(0, 3);
        layoutString = layoutString.slice(3);
        layout.setElement([i, j], SquareType.fromStrRepr(squareStrRepr, 'v3'));
        // Walls (1 character)
      } else if (i % 2 === 0 || j % 2 === 0) {
        const wallStrRepr = layoutString.slice(0, 1);
        layoutString = layoutString.slice(1);
        layout.setElement([i, j], WallType.fromStrRepr(wallStrRepr));
      }
      // Corner walls skipped
    }
  }
  layout.fixCornerWalls();
  return layout;
}
