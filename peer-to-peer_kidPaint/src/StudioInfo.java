public class StudioInfo {
    private String studioName;
    private String ipAddress;
    private int port;
    private String mode; // NEW

    public StudioInfo(String studioName, String ipAddress, int port, String mode) {
        this.studioName = studioName;
        this.ipAddress = ipAddress;
        this.port = port;
        this.mode = mode;
    }

    public String getStudioName() {
        return studioName;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public int getPort() {
        return port;
    }

    public String getMode() {
        return mode;
    }

    @Override
    public String toString() {
        return studioName + " (" + ipAddress + ") - " + mode;
    }
}