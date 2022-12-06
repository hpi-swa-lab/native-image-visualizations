import java.util.Random;
import java.util.HashMap;
import java.util.Map;

public class RandomLanguage
{
    private final Map<String, String> dict;

    public RandomLanguage(int entries)
    {
        Random rand = new Random(42);
        dict = new HashMap<String, String>(entries);

        char[] letters = new char[20];

        for(int i = 0; i < entries; i++)
        {
            int length = 4 + rand.nextInt(17);

            for(int j = 0; j < length; j++)
            {
                letters[j] = (char)('a' + rand.nextInt(26));
            }

            String a = new String(letters, 0, length);

            length = 4 + rand.nextInt(17);

            for(int j = 0; j < length; j++)
            {
                letters[j] = (char)('a' + rand.nextInt(26));
            }

            String b = new String(letters, 0, length);

            dict.put(a, b);
        }
    }

    public String lookup(String word)
    {
        return dict.get(word);
    }
}