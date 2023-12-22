defmodule GameStarter do
  def start_new_game(initial_words) do
    name = {:via, Registry, {GameRegistry, unique_game_name()}}
    {:ok, pid} = DynamicSupervisor.start_child(GameSupervisor, {GameServer, {name, initial_words}})
    {:ok, pid, name}
  end

  defp unique_game_name do
    # Generate a unique name for the game
    :erlang.unique_integer([:positive]) |> Integer.to_string() |> String.to_atom()
  end
end
