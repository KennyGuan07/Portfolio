import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.stage.Modality;
import javafx.stage.Stage;
import java.io.IOException;

public class StudioDialog {
    @FXML private Button btnHost;
    @FXML private Button btnJoin;

    private Stage stage;
    private String selection = "";

    public StudioDialog(Stage owner) throws IOException {
        FXMLLoader loader = new FXMLLoader(getClass().getResource("StudioDialog.fxml"));
        loader.setController(this);
        Parent root = loader.load();

        stage = new Stage();
        stage.initOwner(owner);
        stage.initModality(Modality.APPLICATION_MODAL);
        stage.setTitle("KidPaint Menu");
        stage.setScene(new Scene(root));
        stage.setResizable(false);

        btnHost.setOnAction(e -> {
            selection = "HOST";
            stage.close();
        });

        btnJoin.setOnAction(e -> {
            selection = "JOIN";
            stage.close();
        });
    }

    public String showAndWait() {
        stage.showAndWait();
        return selection;
    }
}