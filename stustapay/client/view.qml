import QtQuick 2.0
import QtQuick.Layouts 1.11
import QtQuick.Controls 2.1
import QtQuick.Window 2.1
import QtQuick.Controls.Material 2.1

ApplicationWindow {
  id: page
  width: 600
  height: 400
  title: "StuStaPay"

  visible: true
  Material.theme: Material.Dark
  Material.accent: Material.Red

  GridLayout {
    id: grid
    columns: 2
    rows: 1

    ColumnLayout {
      spacing: 2
      Layout.columnSpan: 1
      Layout.preferredWidth: 400

      RowLayout {
        Layout.alignment: Qt.AlignVCenter | Qt.AlignHCenter

        Button {
          id: helles
          text: "Helles"
          width: 200
          height: 200
          highlighted: true
          Material.background: Material.Pink
          Material.foreground: "#000000"
          Material.accent: Material.Red
          onClicked: {
            bridge.buyItem(1)
          }
        }
        Button {
          id: wheat_beer
          text: "Breze"
          highlighted: true
          Material.accent: Material.Green
          onClicked: {
            bridge.buyItem(2)
          }
        }
        Button {
          id: coke
          text: "Spezi"
          highlighted: true
          Material.accent: Material.Blue
          onClicked: {
            bridge.buyItem(3)
          }
        }
        Button {
          id: pant
          text: "Weizen"
          highlighted: true
          Material.accent: Material.BlueGrey
          onClicked: {
            bridge.buyItem(4)
          }
        }
      }

      RowLayout {
        Layout.fillWidth: true
        Layout.alignment: Qt.AlignVCenter | Qt.AlignHCenter
        Button {
          id: sendOrder
          text: "Send order"
          highlighted: true
          Material.accent: Material.Green
          onClicked: {
            bridge.sendOrder()
          }
        }
      }

      RowLayout {
        Layout.fillWidth: true
        Layout.alignment: Qt.AlignVCenter | Qt.AlignHCenter
        Button {
          id: abortOrder
          text: "Abort order"
          highlighted: true
          Material.accent: Material.Black
          onClicked: {
            bridge.abortOrder()
          }
        }
      }
    }


    ColumnLayout {
      id: rightcolumn
      spacing: 2
      Layout.columnSpan: 1
      Layout.preferredWidth: 100
      Layout.preferredHeight: 100
      Layout.fillWidth: true

      Text {
        id: statustext
        Layout.alignment: Qt.AlignHCenter
        color: "white"
        font.pointSize: 12
        text: bridge.statustext
        Layout.preferredHeight: 100
        Material.accent: Material.Green
      }
    }
  }
}

