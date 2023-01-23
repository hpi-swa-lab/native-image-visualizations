## Micronaut Example App

### Compiling
- Make sure the environment variable `JAVA_HOME` is set to the respective GraalVM directory.
- `./mvnw package -Dpackaging=native-image`

You can specify custom options (such as `-H:+PrintMethodHistogram`) at the bottom of the `pom.xml` file.

### Running
- `./target/micronautguide`