// The ten colours for the test (school guidelines).

export type ColorId =
  | 'green' | 'yellow' | 'blue' | 'purple' | 'pink'
  | 'gray' | 'white' | 'black' | 'brown' | 'orange';

export interface ColorItem {
  id: ColorId;
  he: string;
  hex: string;
  /** Text colour that reads well on top of the colour. */
  ink: string;
  /** Picture id of an object that is naturally this colour (no English label shown). */
  thing: string;
}

export const COLORS: ColorItem[] = [
  { id: 'green', he: 'ירוק', hex: '#2fb457', ink: '#fff', thing: 'leaf' },
  { id: 'yellow', he: 'צהוב', hex: '#ffd23f', ink: '#3a2a00', thing: 'sun' },
  { id: 'blue', he: 'כחול', hex: '#2f7de1', ink: '#fff', thing: 'drop' },
  { id: 'purple', he: 'סגול', hex: '#8e44c9', ink: '#fff', thing: 'grapes' },
  { id: 'pink', he: 'ורוד', hex: '#ff72b6', ink: '#fff', thing: 'flower' },
  { id: 'gray', he: 'אפור', hex: '#9aa1a9', ink: '#1f2328', thing: 'cloud' },
  { id: 'white', he: 'לבן', hex: '#ffffff', ink: '#33203f', thing: 'snowman' },
  { id: 'black', he: 'שחור', hex: '#1d1b22', ink: '#fff', thing: 'note' },
  { id: 'brown', he: 'חום', hex: '#8a5a2e', ink: '#fff', thing: 'teddy' },
  { id: 'orange', he: 'כתום', hex: '#ff8a1f', ink: '#fff', thing: 'carrot' },
];

export function color(id: ColorId): ColorItem {
  const c = COLORS.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown colour ${id}`);
  return c;
}
