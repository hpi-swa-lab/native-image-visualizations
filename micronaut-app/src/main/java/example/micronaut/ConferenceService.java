package example.micronaut;

import jakarta.inject.Singleton;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import log4j.Logger;

@Singleton 
public class ConferenceService {
    private static Logger logger = Logger.getRootLogger();

    private static final List<Conference> CONFERENCES = Arrays.asList(
            new Conference("Greach"),
            new Conference("GR8Conf EU"),
            new Conference("Micronaut Summit"),
            new Conference("Devoxx Belgium"),
            new Conference("Oracle Code One"),
            new Conference("CommitConf"),
            new Conference("Codemotion Madrid")
    );

    public Conference randomConf() {
        Conference result = CONFERENCES.get(new Random().nextInt(CONFERENCES.size()));

        logger.info(result.getName())

        return result;
    }
}