import org.w3c.dom.*;
import javax.xml.parsers.*;
import java.io.*;

public class Main {
    public static void main(String[] args) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            DocumentBuilder builder = factory.newDocumentBuilder();

            StringBuilder xmlStringBuilder = new StringBuilder();
            xmlStringBuilder.append("<?xml version=\"1.0\"?> <class> </class>");
            ByteArrayInputStream input = new ByteArrayInputStream(
            xmlStringBuilder.toString().getBytes("UTF-8"));
            Document doc = builder.parse(input);
        } catch(Exception e) {
            System.err.println("Leck mich am Arsch: " + e.getMessage());
        }
    }
}
