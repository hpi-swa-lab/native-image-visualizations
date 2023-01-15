export interface Venn_Set {
  sets: string[];
  label?: string;
  size: number;
}

export interface Universe {
  name: string;
  packages: Package[];
}

export interface Package {
  id: number;
  name: string;
}

export const SEPARATOR = ",";

export function get_universe_intersections(universes: Universe[]) {
  return universe_intersections(
    universes_to_exclusive_packages(package_to_universes(universes), universes),
    universes
  );
}

export function universes_to_venn_sets(universes: Universe[]) {
  const intersected_universes = get_universe_intersections(universes);
  const venn_intersections = intersected_universes
    .map(universe_to_venn_set)
    .filter((intersection) => intersection.sets.length > 1);
  return universes.map(universe_to_venn_set).concat(venn_intersections);
}

export function package_to_universes(universes: Universe[]) {
  const package_to_universes: Map<string, Array<string>> = new Map();
  universes.forEach((universe) => {
    universe.packages.forEach((pkg) => {
      if (package_to_universes.has(pkg.name)) {
        package_to_universes.get(pkg.name).push(universe.name);
      } else {
        package_to_universes.set(pkg.name, [universe.name]);
      }
    });
  });
  return package_to_universes;
}

// Exclusive sets, meaning each package will only be in one intersection
export function universes_to_exclusive_packages(
  package_to_universes: Map<string, Array<string>>,
  base_universes: readonly Universe[]
) {
  const universes_to_exclusive_packages: Map<string, Array<string>> = new Map();
  let intersection_representation: string = "";
  let found = false;
  let contained_base_universes = [];
  package_to_universes.forEach((value, key) => {
    intersection_representation = value.toString();
    if (universes_to_exclusive_packages.has(intersection_representation)) {
      universes_to_exclusive_packages
        .get(intersection_representation)
        .push(key);
    } else {
      universes_to_exclusive_packages.set(intersection_representation, [key]);
    }
  });

  const possibleSubsets: string[][] = subsets(
    base_universes.map((universe) => universe.name)
  ).filter((subset: string[]) => subset.length > 0);

  // fill in all subsets that haven't been filled (eg total or no intersection)
  for (const subset in possibleSubsets) {
    // basically find() on a map
    found = false;
    universes_to_exclusive_packages.forEach(
      (packages: string[], universe: string) => {
        if (!found) {
          contained_base_universes = universe.split(SEPARATOR);
          found =
            sameMembers(contained_base_universes, possibleSubsets[subset]) &&
            contained_base_universes.length == possibleSubsets[subset].length;
        }
      }
    );

    if (!found) {
      universes_to_exclusive_packages.set(
        possibleSubsets[subset].toLocaleString(),
        []
      );
    }
  }

  return universes_to_exclusive_packages;
}

export function exclusive_to_inclusive_packages(
  universes_to_exclusive_packages: Map<string, Array<string>>
) {
  let base_universes = [];
  let intersection_representation = "";
  let universes_to_inclusive_packages = new Map();
  // For intersections like {A, B, C} we have to split them to {A,B}, {B,C}, {A,C}
  universes_to_exclusive_packages.forEach((value: string[], key: string) => {
    base_universes = key.split(SEPARATOR);
    if (key.split(SEPARATOR).length > 2) {
      for (const universeA in base_universes) {
        for (const universeB in base_universes) {
          if (universeA == universeB) continue;
          intersection_representation = base_universes[universeA].concat(
            SEPARATOR,
            base_universes[universeB]
          );
          if (
            universes_to_inclusive_packages.has(intersection_representation) ||
            universes_to_inclusive_packages.has(
              base_universes[universeB].concat(
                SEPARATOR,
                base_universes[universeA]
              )
            )
          )
            continue;
          universes_to_inclusive_packages.set(
            intersection_representation,
            value
          ); // NOT EXCLUSIVE! these elements are now duplicated (but needed for venn)
        }
      }
    }
  });
}

export function universe_to_venn_set(universe: Universe) {
  return {
    sets: universe.name.split(SEPARATOR),
    size: universe.packages.length,
  } as Venn_Set;
}

export function universe_intersections(
  universes_to_packages: Map<string, Array<string>>,
  universes: Universe[]
) {
  return Array.from(universes_to_packages).map(
    ([key, value]) =>
      ({
        name: key,
        packages: value.map((package_name) =>
          package_name_to_package_object(
            package_name,
            key.split(SEPARATOR)[0],
            universes
          )
        ),
      } as Universe)
  );
}

export function package_name_to_package_object(
  package_name: string,
  belonging_universe_name: string,
  universes: Universe[]
) {
  return universes
    .find(
      (universe) => universe.name.localeCompare(belonging_universe_name) == 0
    )
    .packages.find((pkg) => pkg.name.localeCompare(package_name) === 0);
}

export function intersections_between(universes: Universe[]): Universe[] {
  const powerset: Universe[][] = subsets(universes).filter(
    (subset: Universe[]) => subset.length > 0
  );
  let shared: Package[] = [];
  let packages: string[][];
  let universe_name: string = "";
  return powerset.map((subset: Universe[]) => {
    universe_name = subset.map((universe) => universe.name).join(SEPARATOR);

    packages = subset.map((universe) =>
      universe.packages.map((pkg) => pkg.name)
    );
    shared = intersection(packages).map((name) =>
      package_name_to_package_object(name, subset[0].name, subset)
    );

    return { packages: shared, name: universe_name } as Universe;
  });
}

// helper functions
export function subsets(array: Array<any>): Array<Array<any>> {
  return array.reduce(
    (subsets, value) => subsets.concat(subsets.map((set:any) => [value, ...set])),
    [[]]
  );
}

export function sameMembers(arr1: string[], arr2: string[]) {
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);
  return (
    arr1.every((item) => set2.has(item)) && arr2.every((item) => set1.has(item))
  );
}

export function intersection(lists: any[][]) {
  var result = [];

  for (var i = 0; i < lists.length; i++) {
    var currentList = lists[i];
    for (var y = 0; y < currentList.length; y++) {
      var currentValue = currentList[y];
      if (result.indexOf(currentValue) === -1) {
        if (
          lists.filter(function (obj) {
            return obj.indexOf(currentValue) == -1;
          }).length == 0
        ) {
          result.push(currentValue);
        }
      }
    }
  }
  return result;
}
