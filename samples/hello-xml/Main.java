import org.w3c.dom.*;
import javax.xml.parsers.*;
import java.io.*;

public class Main {
    public static void doStdioStuff()
    {
        System.out.println("Is System.out.println() increasing my image size???");
    }

    public static void doXmlStuff()
    {
        String xmlData = "<?xml version=\"1.0\"?> <class> Is XML increasing my image size??? </class>";

        try {
            DocumentBuilder builder = DocumentBuilderFactory.newInstance().newDocumentBuilder();
            ByteArrayInputStream input = new ByteArrayInputStream(xmlData.getBytes("UTF-8"));
            Document doc = builder.parse(input);
        } catch(Exception e) {
        }
    }

    public static void main(String[] args) {
        doStdioStuff();
        doXmlStuff();
    }
}
