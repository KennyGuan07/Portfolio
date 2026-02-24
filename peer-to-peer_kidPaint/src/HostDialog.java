import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.CheckBox;
import javafx.scene.control.TextField;
import javafx.stage.Modality;
import javafx.stage.Stage;

import java.io.IOException;

public class HostDialog {
    @FXML private TextField txtName;
    @FXML private TextField txtSize;
    @FXML private CheckBox chkDrawGuess;
    @FXML private Button btnBack;
    @FXML private Button btnCreate;

    private Stage stage;
    private boolean created = false;

    // Data to return
    private String roomName;
    private int canvasSize = 50;
    private boolean isDrawGuess = false;

    public HostDialog(Stage owner) throws IOException {
        FXMLLoader loader = new FXMLLoader(getClass().getResource("HostDialog.fxml"));
        loader.setController(this);
        Parent root = loader.load();

        stage = new Stage();
        stage.initOwner(owner);
        stage.initModality(Modality.APPLICATION_MODAL);
        stage.setTitle("Create Room");
        stage.setScene(new Scene(root));
        stage.setResizable(false);

        // Force numeric input for canvas size
        addNumericListener(txtSize);

        // Add character limit for room name (max 30)
        txtName.textProperty().addListener((obs, oldVal, newVal) -> {
            if (newVal.length() > 30) {
                txtName.setText(oldVal);
            }
        });

        btnCreate.setOnAction(e -> {
            roomName = txtName.getText().trim();
            if(roomName.isEmpty()) roomName = "Untitled Room";

            try {
                canvasSize = Integer.parseInt(txtSize.getText());
            } catch (NumberFormatException ex) {
                canvasSize = 50;
            }

            // NEW: Prevent canvasSize <= 0
            if (canvasSize <= 0) {
                canvasSize = 50;
            }

            isDrawGuess = chkDrawGuess.isSelected();
            created = true;
            stage.close();
        });

        btnBack.setOnAction(e -> {
            created = false; // Signals that we want to go back
            stage.close();
        });
    }

    private void addNumericListener(TextField tf) {
        tf.textProperty().addListener((obs, oldVal, newVal) -> {
            if (!newVal.matches("\\d*")) {
                tf.setText(newVal.replaceAll("[^\\d]", ""));
            }
        });
    }

    public boolean showAndWait() {
        stage.showAndWait();
        return created;
    }

    public String getRoomName() { return roomName; }
    public int getCanvasSize() { return canvasSize; }
    public boolean isDrawGuess() { return isDrawGuess; }
}