const SEPARATOR = ",";
function get_universe_intersections(universes) {
    return universe_intersections(universes_to_exclusive_packages(package_to_universes(universes), universes), universes);
}
function universes_to_venn_sets(universes) {
    const intersected_universes = get_universe_intersections(universes);
    const venn_intersections = intersected_universes
        .map(universe_to_venn_set)
        .filter((intersection) => intersection.sets.length > 1);
    return universes.map(universe_to_venn_set).concat(venn_intersections);
}
function package_to_universes(universes) {
    const package_to_universes = new Map();
    universes.forEach((universe) => {
        universe.packages.forEach((package) => {
            if (package_to_universes.has(package.name)) {
                package_to_universes.get(package.name).push(universe.name);
            }
            else {
                package_to_universes.set(package.name, [universe.name]);
            }
        });
    });
    return package_to_universes;
}
function universes_to_exclusive_packages(package_to_universes, base_universes) {
    const universes_to_exclusive_packages = new Map();
    let intersection_representation = "";
    let found = false;
    let contained_base_universes = [];
    package_to_universes.forEach((value, key) => {
        intersection_representation = value.toString();
        if (universes_to_exclusive_packages.has(intersection_representation)) {
            universes_to_exclusive_packages
                .get(intersection_representation)
                .push(key);
        }
        else {
            universes_to_exclusive_packages.set(intersection_representation, [key]);
        }
    });
    const possibleSubsets = subsets(base_universes.map((universe) => universe.name)).filter((subset) => subset.length > 0);
    for (const subset in possibleSubsets) {
        found = false;
        universes_to_exclusive_packages.forEach((packages, universe) => {
            if (!found) {
                contained_base_universes = universe.split(SEPARATOR);
                found =
                    sameMembers(contained_base_universes, possibleSubsets[subset]) &&
                        contained_base_universes.length == possibleSubsets[subset].length;
            }
        });
        if (!found) {
            universes_to_exclusive_packages.set(possibleSubsets[subset].toLocaleString(), []);
        }
    }
    return universes_to_exclusive_packages;
}
function exclusive_to_inclusive_packages(universes_to_exclusive_packages) {
    let base_universes = [];
    let intersection_representation = "";
    let universes_to_inclusive_packages = new Map();
    universes_to_exclusive_packages.forEach((value, key) => {
        base_universes = key.split(SEPARATOR);
        if (key.split(SEPARATOR).length > 2) {
            for (const universeA in base_universes) {
                for (const universeB in base_universes) {
                    if (universeA == universeB)
                        continue;
                    intersection_representation = base_universes[universeA].concat(SEPARATOR, base_universes[universeB]);
                    if (universes_to_inclusive_packages.has(intersection_representation) ||
                        universes_to_inclusive_packages.has(base_universes[universeB].concat(SEPARATOR, base_universes[universeA])))
                        continue;
                    universes_to_inclusive_packages.set(intersection_representation, value);
                }
            }
        }
    });
}
function universe_to_venn_set(universe) {
    return {
        sets: universe.name.split(SEPARATOR),
        size: universe.packages.length,
    };
}
function universe_intersections(universes_to_packages, universes) {
    return Array.from(universes_to_packages).map(([key, value]) => ({
        name: key,
        packages: value.map((package_name) => package_name_to_package_object(package_name, key.split(SEPARATOR)[0], universes)),
    }));
}
function package_name_to_package_object(package_name, belonging_universe_name, universes) {
    return universes
        .find((universe) => universe.name.localeCompare(belonging_universe_name) == 0)
        .packages.find((package) => package.name.localeCompare(package_name) === 0);
}
function intersections_between(universes) {
    const powerset = subsets(universes).filter((subset) => subset.length > 0);
    let shared = [];
    let packages;
    let universe_name = "";
    return powerset.map((subset) => {
        universe_name = subset.map((universe) => universe.name).join(SEPARATOR);
        packages = subset.map((universe) => universe.packages.map((package) => package.name));
        shared = intersection(packages).map((name) => package_name_to_package_object(name, subset[0].name, subset));
        return { packages: shared, name: universe_name };
    });
}
function subsets(array) {
    return array.reduce((subsets, value) => subsets.concat(subsets.map((set) => [value, ...set])), [[]]);
}
function sameMembers(arr1, arr2) {
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    return (arr1.every((item) => set2.has(item)) && arr2.every((item) => set1.has(item)));
}
function intersection(lists) {
    var result = [];
    for (var i = 0; i < lists.length; i++) {
        var currentList = lists[i];
        for (var y = 0; y < currentList.length; y++) {
            var currentValue = currentList[y];
            if (result.indexOf(currentValue) === -1) {
                if (lists.filter(function (obj) {
                    return obj.indexOf(currentValue) == -1;
                }).length == 0) {
                    result.push(currentValue);
                }
            }
        }
    }
    return result;
}
//# sourceMappingURL=tsc.js.map