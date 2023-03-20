package example.micronaut;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable 
public class Conference {

    private final String name;

    public Conference(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }
}