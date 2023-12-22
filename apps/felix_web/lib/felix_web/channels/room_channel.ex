defmodule FelixWeb.RoomChannel do
  use FelixWeb, :channel

  @impl true
  def join("lobby", payload, socket) do
    if authorized?(payload) do
      {:ok, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end


  @impl true
  def join("room:" <> room_id, payload, socket) do
    IO.puts "room_id: #{room_id}"
    if authorized?(payload) do
      {:ok, socket |> assign(:room_id, room_id)}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  # Channels can be used in a request/response fashion
  # by sending replies to requests from the client
  @impl true
  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  # It is also common to receive messages from the client and
  # broadcast to everyone in the current topic (room:lobby).
  @impl true
  def handle_in("shout", payload, socket) when payload |> is_binary do
    broadcast(socket, "shout", {:binary, payload})
    {:noreply, socket}
  end

  @impl true
  def handle_in("shout", payload, socket) do
    broadcast(socket, "shout", payload)
    {:noreply, socket}
  end

  @impl true
  def handle_in("complete", payload, socket) do
    new_word = GameServer.next(socket.assigns.room_id)
    IO.puts " COMPLETE - new word: #{new_word}"

    if (is_nil(new_word)) do
      on_game_over(socket)
    else
      broadcast(socket, "game:update", %{current_word: new_word})
    end

    {:noreply, socket}
  end

  @impl true
  def handle_in("pass", payload, socket) do
    new_word = GameServer.pass(socket.assigns.room_id)
    IO.puts " PASS - new word: #{new_word}"

    if (is_nil(new_word)) do
      on_game_over(socket)
    else
      broadcast(socket, "game:update", %{current_word: new_word})
    end

    {:noreply, socket}
  end

  @impl true
  def handle_in("fail", payload, socket) do
    new_word = GameServer.fail(socket.assigns.room_id)
    IO.puts " FAIL - new word: #{new_word}"

    if (is_nil(new_word)) do
      on_game_over(socket)
    else
      broadcast(socket, "game:update", %{current_word: new_word})
    end

    {:noreply, socket}
  end

  @impl true
  def handle_in("get_current", payload, socket) do
    {current_word, current_category} = GameServer.get_word_and_category(socket.assigns.room_id)

    if (is_nil(current_word)) do
      on_game_over(socket)
    end

    {:reply, {:ok, %{current_word: current_word, current_category:  current_category}}, socket}
  end

  defp on_game_over(socket) do
    broadcast(socket, "game:over", %{score: GameServer.get_score(socket.assigns.room_id)})
  end

  # Add authorization logic here as required.
  defp authorized?(_payload) do
    true
  end
end
