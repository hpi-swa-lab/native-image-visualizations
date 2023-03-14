package example.micronaut;

import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;

@Controller("/conferences") 
public class ConferenceController {

    private final ConferenceService conferenceService;

    public ConferenceController(ConferenceService conferenceService) { 
        this.conferenceService = conferenceService;
    }

    @Get("/random") 
    public Conference randomConf() { 
        return conferenceService.randomConf();
    }
}