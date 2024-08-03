import { SquareType, WallType } from '../../utils/helpers';
import { Layout } from '../../components/layout/Layout';

export class SerializerV3 {
  private static characterUnMap = new Map([
    ['0', 0],
    ['1', 1],
    ['2', 2],
    ['3', 3],
    ['4', 4],
    ['5', 5],
    ['6', 6],
    ['7', 7],
    ['8', 8],
    ['9', 9],
    ['a', 10],
    ['b', 11],
    ['c', 12],
    ['d', 13],
    ['e', 14],
    ['f', 15],
    ['g', 16],
    ['h', 17],
    ['i', 18],
    ['j', 19],
    ['k', 20],
    ['l', 21],
    ['m', 22],
    ['n', 23],
    ['o', 24],
    ['p', 25],
    ['q', 26],
    ['r', 27],
    ['s', 28],
    ['t', 29],
    ['u', 30],
    ['v', 31],
    ['w', 32],
    ['x', 33],
    ['y', 34],
    ['z', 35],
    ['A', 36],
    ['B', 37],
    ['C', 38],
    ['D', 39],
    ['E', 40],
    ['F', 41],
    ['G', 42],
    ['H', 43],
    ['I', 44],
    ['J', 45],
    ['K', 46],
    ['L', 47],
    ['M', 48],
    ['N', 49],
    ['O', 50],
    ['P', 51],
    ['Q', 52],
    ['R', 53],
    ['S', 54],
    ['T', 55],
    ['U', 56],
    ['V', 57],
    ['W', 58],
    ['X', 59],
    ['Y', 60],
    ['Z', 61],
    ['_', 62],
    ['-', 63],
  ]);

  private static wallDecodeMap = new Map([
    [0b11, '0'],
    [0b01, 'w'],
    [0b10, 'h'],
  ]);

  private static bitsPerWall = 2;
  private static wallsPerByte = 3;

  // Extracts the ith wall from an encoding in the characterUnMap
  private static extractWallAtIndex(wallEncoding: number, i: number) {
    const extractor = (1 << SerializerV3.bitsPerWall) - 1; // 0b11
    const shift = i * SerializerV3.bitsPerWall;
    const wallRepresentation = (wallEncoding >> shift) & extractor;
    return wallRepresentation;
  }

  // Extracts a list of walls from a given wall encoding
  private static extractWalls(wallEncoding: number) {
    return [...Array(SerializerV3.wallsPerByte)].map((_, i) => {
      return SerializerV3.extractWallAtIndex(wallEncoding, i);
    });
  }

  static *deserializeWalls(
    wallEncoding: string,
  ): Generator<string, null, null> {
    const walls = wallEncoding
      .split('')
      .map((char) => {
        const wallEncoding = SerializerV3.characterUnMap.get(char);
        if (wallEncoding === undefined) {
          throw new URIError(
            `Invalid characterUnMap character, cannot decode walls: ${char}`,
          );
        } else {
          return wallEncoding;
        }
      })
      .map((wallEncoding) => SerializerV3.extractWalls(wallEncoding))
      .flat()
      .map((wallCode) => SerializerV3.wallDecodeMap.get(wallCode))
      .filter((wall) => wall !== undefined) as string[];

    for (const wall of walls) {
      yield wall;
    }

    return null;
  }
}

export default function decodeLayoutV3(decompressed: string) {
  // eslint-disable-next-line prefer-const
  console.log(decompressed);
  const [version, size, layoutString, wallString] = decompressed.split(' ');
  if (version !== 'v3') {
    throw new URIError('Invalid layout string version');
  }

  const placedAppliances: string[] = [];

  layoutString.split('|').forEach((element) => {
    placedAppliances.push(element);
  });

  placedAppliances.pop();

  const [height, width] = size.split('x').map((x) => parseInt(x));

  const wallsDecoded = SerializerV3.deserializeWalls(wallString);

  const layout = new Layout(height, width);
  const numVerticalElements = layout.height * 2 - 1;
  const numHorizontalElements = layout.width * 2 - 1;
  for (let i = 0; i < numVerticalElements; i++) {
    for (let j = 0; j < numHorizontalElements; j++) {
      if (i % 2 === 0 && j % 2 === 0) {
        const appliance = placedAppliances.shift();
        if (appliance) {
          layout.setElement([i, j], SquareType.fromStrRepr(appliance, 'v3'));
        }
      } else if (i % 2 === 0 || j % 2 === 0) {
        // Skip Corner Walls
        const wallStrRepr = wallsDecoded.next().value;
        if (wallStrRepr) {
          const wall = WallType.fromStrRepr(wallStrRepr);
          layout.setElement([i, j], wall);
        } else {
          throw new URIError('Invalid Encoding of Walls');
        }
      }
    }
  }
  layout.fixCornerWalls();
  return layout;
}
