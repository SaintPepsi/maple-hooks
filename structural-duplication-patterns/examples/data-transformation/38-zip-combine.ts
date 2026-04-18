// Pattern 38: Zip-Combine
// Shape: Combine multiple arrays element-wise

// === Types ===

interface Student {
  id: string;
  name: string;
}

interface Grade {
  studentId: string;
  score: number;
  subject: string;
}

interface StudentWithGrade {
  student: Student;
  grade: Grade;
}

interface Coordinate {
  x: number;
  y: number;
}

interface Label {
  text: string;
  position: Coordinate;
}

// === Variant A: Zip students with grades ===

function zipStudentsWithGrades(
  students: Student[],
  grades: Grade[]
): StudentWithGrade[] {
  const result: StudentWithGrade[] = [];
  const len = Math.min(students.length, grades.length);
  for (let i = 0; i < len; i++) {
    result.push({
      student: students[i],
      grade: grades[i],
    });
  }
  return result;
}

function zipStudentNames(students: Student[], grades: Grade[]): Array<[string, number]> {
  const result: Array<[string, number]> = [];
  const len = Math.min(students.length, grades.length);
  for (let i = 0; i < len; i++) {
    result.push([students[i].name, grades[i].score]);
  }
  return result;
}

// === Variant B: Zip coordinates with labels ===

function zipCoordinatesWithLabels(
  coordinates: Coordinate[],
  labels: string[]
): Label[] {
  const result: Label[] = [];
  const len = Math.min(coordinates.length, labels.length);
  for (let i = 0; i < len; i++) {
    result.push({
      text: labels[i],
      position: coordinates[i],
    });
  }
  return result;
}

function zipXY(xValues: number[], yValues: number[]): Coordinate[] {
  const result: Coordinate[] = [];
  const len = Math.min(xValues.length, yValues.length);
  for (let i = 0; i < len; i++) {
    result.push({
      x: xValues[i],
      y: yValues[i],
    });
  }
  return result;
}

// === Variant C: Zip keys with values into object ===

function zipToObject<T>(keys: string[], values: T[]): Record<string, T> {
  const result: Record<string, T> = {};
  const len = Math.min(keys.length, values.length);
  for (let i = 0; i < len; i++) {
    result[keys[i]] = values[i];
  }
  return result;
}

function zipArrays<T, U>(first: T[], second: U[]): Array<[T, U]> {
  const result: Array<[T, U]> = [];
  const len = Math.min(first.length, second.length);
  for (let i = 0; i < len; i++) {
    result.push([first[i], second[i]]);
  }
  return result;
}

// === Zip three arrays ===

function zipThree<A, B, C>(
  first: A[],
  second: B[],
  third: C[]
): Array<[A, B, C]> {
  const result: Array<[A, B, C]> = [];
  const len = Math.min(first.length, second.length, third.length);
  for (let i = 0; i < len; i++) {
    result.push([first[i], second[i], third[i]]);
  }
  return result;
}

// === Zip with index ===

function zipWithIndex<T>(items: T[]): Array<[T, number]> {
  const result: Array<[T, number]> = [];
  for (let i = 0; i < items.length; i++) {
    result.push([items[i], i]);
  }
  return result;
}

// === Exports ===

export {
  zipStudentsWithGrades,
  zipStudentNames,
  zipCoordinatesWithLabels,
  zipXY,
  zipToObject,
  zipArrays,
  zipThree,
  zipWithIndex,
};

export type { Student, Grade, StudentWithGrade, Coordinate, Label };
