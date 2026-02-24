import javafx.application.Application;
import javafx.stage.Stage;

public class KidPaint2 extends Application {
    final static String TITLE = "KidPaint 2.0";
    final static int SERVER_PORT = 12345;

    PaintServerHost server;

    @Override
    public void start(Stage stage) throws Exception {
        try {
            // 1. Get username
            GetNameDialog nameDialog = new GetNameDialog(TITLE);
            String username = nameDialog.getPlayername();
            if (username == null || username.trim().isEmpty()) return;
            stage.setTitle(TITLE + " - " + username);

            boolean keepingSelection = true;

            while (keepingSelection) {
                // 2. Show Main Menu (Host or Join?)
                StudioDialog menu = new StudioDialog(stage);
                String choice = menu.showAndWait(); // Returns "HOST", "JOIN", or null

                if ("HOST".equals(choice)) {
                    // 3a. Show Create Room Form (The screenshot UI)
                    HostDialog hostDialog = new HostDialog(stage);
                    boolean created = hostDialog.showAndWait();

                    if (created) {
                        // User clicked "Create Room"
                        String roomName = hostDialog.getRoomName();
                        int size = hostDialog.getCanvasSize();
                        boolean isDrawGuess = hostDialog.isDrawGuess();

                        server = new PaintServerHost(SERVER_PORT, roomName, size, isDrawGuess);
                        new Thread(server).start();

                        new MainWindow(stage, username, "127.0.0.1", SERVER_PORT, true, isDrawGuess);
                        keepingSelection = false; // Exit loop, game started
                    }
                    // If created is false (Back clicked), loop continues -> shows Menu again

                } else if ("JOIN".equals(choice)) {
                    // 3b. Show List Dialog
                    StudioListDialog listDialog = new StudioListDialog(stage);
                    StudioInfo info = listDialog.showAndWait();

                    if (info != null) {
                        // User selected a room
                        new MainWindow(stage, username, info.getIpAddress(), info.getPort(), false, false); // Dummy false for mode, will be set by server
                        keepingSelection = false; // Exit loop, game started
                    }
                    // If info is null (Dialog closed), loop continues -> shows Menu again

                } else {
                    // User closed the menu
                    keepingSelection = false;
                    System.exit(0);
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void stop() {
        System.exit(0);
    }
}