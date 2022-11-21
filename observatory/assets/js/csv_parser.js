export function load_csv_file(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            complete: (results) => resolve(results),
            error: (err) => reject(err)
        })
    })
}
