// TODO: create a separate package for this so it can be reused across projects

export const isDefined = <T>(value: T | null | undefined): value is T => value != null;
